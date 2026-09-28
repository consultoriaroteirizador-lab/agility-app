/**
 * `requestWithdrawal` precisa invalidar `[KEY_WALLET]` tanto no sucesso quanto no erro
 * (`onSettled`): o back pode ter criado o WITHDRAWAL_HOLD e mesmo assim devolvido um 400
 * (ex.: outro saque concorrente esgotou o saldo disponível depois do hold deste). Com
 * `onSuccess`, o saldo e "Meus saques" ficavam desatualizados no caminho de erro.
 */
import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TestRenderer, { act } from 'react-test-renderer';

import { KEY_WALLET } from '@/domain/queryKeys';

import { walletAPI } from '../../walletAPI';
import { useRequestWithdrawal } from '../useRequestWithdrawal';

jest.mock('../../walletAPI', () => ({
    walletAPI: { requestWithdrawal: jest.fn() },
}));

const mockRequestWithdrawal = walletAPI.requestWithdrawal as jest.Mock;

let queryClient: QueryClient;
let hook!: ReturnType<typeof useRequestWithdrawal>;

function montar() {
    let tree!: TestRenderer.ReactTestRenderer;
    function Probe() {
        hook = useRequestWithdrawal();
        return null;
    }
    act(() => {
        tree = TestRenderer.create(
            <QueryClientProvider client={queryClient}>
                <Probe />
            </QueryClientProvider>,
        );
    });
    return tree;
}

beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    mockRequestWithdrawal.mockReset();
});

describe('useRequestWithdrawal — invalidação no settle', () => {
    it('sucesso: invalida [KEY_WALLET]', async () => {
        mockRequestWithdrawal.mockResolvedValue({ id: 'saque-1' });
        queryClient.setQueryData([KEY_WALLET, 'balance'], {});
        const tree = montar();

        await act(async () => {
            await hook.requestWithdrawal({ amount: 1000 });
        });

        expect(queryClient.getQueryState([KEY_WALLET, 'balance'])?.isInvalidated).toBe(true);

        act(() => tree.unmount());
        queryClient.clear();
    });

    it('erro do back (ex.: saldo insuficiente): TAMBÉM invalida [KEY_WALLET]', async () => {
        mockRequestWithdrawal.mockRejectedValue({
            success: false,
            error: { message: 'Saldo disponível insuficiente', code: 'INSUFFICIENT_BALANCE' },
        });
        queryClient.setQueryData([KEY_WALLET, 'balance'], {});
        const tree = montar();

        await act(async () => {
            await expect(hook.requestWithdrawal({ amount: 1000 })).rejects.toBeTruthy();
        });

        expect(queryClient.getQueryState([KEY_WALLET, 'balance'])?.isInvalidated).toBe(true);

        act(() => tree.unmount());
        queryClient.clear();
    });
});
