/**
 * Concluir a rota faz nascer a parcela de frete (F2): "Frete a liberar" e o extrato mudam.
 * O hook invalida as chaves de dinheiro ANTES do onSuccess de quem chama (que costuma
 * navegar para a home).
 */
import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TestRenderer, { act } from 'react-test-renderer';

import { KEY_FINANCE, KEY_WALLET } from '@/domain/queryKeys';

import { useCompleteRouting } from '../useCompleteRouting';

// O hook só repassa a config ao useMutationService; o teste captura o onSuccess.
let mockConfig: { onSuccess?: (data: unknown) => unknown } = {};
jest.mock('@/api', () => ({
    useMutationService: (config: { onSuccess?: (data: unknown) => unknown }) => {
        mockConfig = config;
        return { mutate: jest.fn(), isLoading: false, isSuccess: false, isError: false };
    },
}));
jest.mock('../../routingService', () => ({ routingService: { complete: jest.fn() } }));

it('no sucesso, invalida carteira e cobranças e depois chama o onSuccess de quem chamou', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
    queryClient.setQueryData([KEY_WALLET, 'balance'], {});
    queryClient.setQueryData([KEY_FINANCE, 'payments', 'infinite', { startDate: '2026-09-01' }], {});
    const onSuccess = jest.fn(() => {
        expect(queryClient.getQueryState([KEY_WALLET, 'balance'])?.isInvalidated).toBe(true);
    });

    function Probe() {
        useCompleteRouting({ onSuccess });
        return null;
    }
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
        tree = TestRenderer.create(
            <QueryClientProvider client={queryClient}>
                <Probe />
            </QueryClientProvider>,
        );
    });

    await act(async () => {
        await mockConfig.onSuccess?.({ success: true });
    });

    expect(onSuccess).toHaveBeenCalledWith({ success: true });
    expect(queryClient.getQueryState([KEY_FINANCE, 'payments', 'infinite', { startDate: '2026-09-01' }])?.isInvalidated).toBe(true);

    act(() => tree.unmount());
    queryClient.clear();
});
