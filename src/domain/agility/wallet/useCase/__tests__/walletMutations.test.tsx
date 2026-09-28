/**
 * Os hooks de gesto de dinheiro devolvem `mutateAsync`: a promise REJEITA no erro do
 * back. Com `mutate` (antes), o `await` na tela resolvia na hora e o toast de sucesso
 * aparecia com o saque recusado (auditoria, Bug 2).
 */
import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TestRenderer, { act } from 'react-test-renderer';

import { KEY_WALLET } from '@/domain/queryKeys';

import { useRequestWithdrawal } from '../useRequestWithdrawal';

const mockRequestWithdrawal = jest.fn();
jest.mock('../../walletAPI', () => ({
    walletAPI: {
        requestWithdrawal: (...args: unknown[]) => mockRequestWithdrawal(...args),
    },
}));

let saque!: ReturnType<typeof useRequestWithdrawal>;
function Probe() {
    saque = useRequestWithdrawal();
    return null;
}

let queryClient: QueryClient;
let tree: TestRenderer.ReactTestRenderer | null = null;

beforeEach(() => {
    mockRequestWithdrawal.mockReset();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });
    queryClient.setQueryData([KEY_WALLET, 'balance'], { availableBalance: 10000 });
    act(() => {
        tree = TestRenderer.create(
            <QueryClientProvider client={queryClient}>
                <Probe />
            </QueryClientProvider>,
        );
    });
});

afterEach(() => {
    if (tree) act(() => tree!.unmount());
    tree = null;
    queryClient.clear();
});

describe('useRequestWithdrawal', () => {
    it('rejeita quando o back recusa (nada de sucesso silencioso)', async () => {
        const erro = { success: false, error: { message: 'Saldo disponível insuficiente' } };
        mockRequestWithdrawal.mockRejectedValue(erro);

        await act(async () => {
            await expect(saque.requestWithdrawal({ amount: 5000 })).rejects.toBe(erro);
        });
    });

    it('resolve com o saque e invalida a carteira', async () => {
        mockRequestWithdrawal.mockResolvedValue({ id: 'wd-1', amount: 5000 });

        await act(async () => {
            await expect(saque.requestWithdrawal({ amount: 5000 })).resolves.toEqual({ id: 'wd-1', amount: 5000 });
        });

        expect(mockRequestWithdrawal).toHaveBeenCalledWith({ amount: 5000 });
        expect(queryClient.getQueryState([KEY_WALLET, 'balance'])?.isInvalidated).toBe(true);
    });
});
