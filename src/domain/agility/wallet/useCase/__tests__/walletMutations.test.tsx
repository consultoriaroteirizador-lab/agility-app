/**
 * Os hooks de gesto de dinheiro devolvem `mutateAsync`: a promise REJEITA no erro do
 * back. Com `mutate` (antes), o `await` na tela resolvia na hora e o toast de sucesso
 * aparecia com o saque ou os dados bancários recusados (auditoria, Bugs 2 e 3).
 */
import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TestRenderer, { act } from 'react-test-renderer';

import { KEY_WALLET } from '@/domain/queryKeys';

import { useRequestWithdrawal } from '../useRequestWithdrawal';
import { useUpdateBankInfo } from '../useUpdateBankInfo';

const mockRequestWithdrawal = jest.fn();
const mockUpdateBankInfo = jest.fn();
jest.mock('../../walletAPI', () => ({
    walletAPI: {
        requestWithdrawal: (...args: unknown[]) => mockRequestWithdrawal(...args),
        updateBankInfo: (...args: unknown[]) => mockUpdateBankInfo(...args),
    },
}));

let saque!: ReturnType<typeof useRequestWithdrawal>;
let dados!: ReturnType<typeof useUpdateBankInfo>;
function Probe() {
    saque = useRequestWithdrawal();
    dados = useUpdateBankInfo();
    return null;
}

let queryClient: QueryClient;
let tree: TestRenderer.ReactTestRenderer | null = null;

beforeEach(() => {
    mockRequestWithdrawal.mockReset();
    mockUpdateBankInfo.mockReset();
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

describe('useUpdateBankInfo', () => {
    it('rejeita quando o back recusa', async () => {
        const erro = { success: false, error: { message: 'pixKeyType must be one of the following values' } };
        mockUpdateBankInfo.mockRejectedValue(erro);

        await act(async () => {
            await expect(dados.updateBankInfo({ pixKey: null, pixKeyType: null })).rejects.toBe(erro);
        });
    });

    it('resolve e invalida a carteira', async () => {
        mockUpdateBankInfo.mockResolvedValue({ id: 'w-1', hasBankInfo: true });

        await act(async () => {
            await dados.updateBankInfo({ bankName: 'Banco X', bankAgency: '1', bankAccount: '2', pixKey: null, pixKeyType: null });
        });

        expect(queryClient.getQueryState([KEY_WALLET, 'balance'])?.isInvalidated).toBe(true);
    });
});
