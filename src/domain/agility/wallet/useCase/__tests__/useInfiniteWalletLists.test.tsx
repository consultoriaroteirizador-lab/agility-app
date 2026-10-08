import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TestRenderer, { act } from 'react-test-renderer';

import { useInfiniteAdvances, useInfiniteTransactions } from '../useInfiniteWalletLists';

const mockGetTransactions = jest.fn();
const mockGetAdvances = jest.fn();
jest.mock('../../walletAPI', () => ({
    walletAPI: {
        getTransactions: (...args: unknown[]) => mockGetTransactions(...args),
        getAdvances: (...args: unknown[]) => mockGetAdvances(...args),
    },
}));
jest.mock('@/services', () => ({
    useAuthCredentialsService: () => ({ authCredentials: { accessToken: 't', tenantId: 'c-1' } }),
}));

let resultado!: ReturnType<typeof useInfiniteTransactions>;
function Probe() {
    resultado = useInfiniteTransactions({ type: 'FREIGHT' });
    return null;
}

async function settle() {
    for (let i = 0; i < 10; i++) {
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });
    }
}

it('pede a página 1 com o tamanho fixo e repassa os filtros', async () => {
    mockGetTransactions.mockResolvedValue({ data: [{ id: 'tx-1' }], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
        tree = TestRenderer.create(
            <QueryClientProvider client={queryClient}>
                <Probe />
            </QueryClientProvider>,
        );
    });
    await settle();

    expect(mockGetTransactions).toHaveBeenCalledWith({ type: 'FREIGHT', page: 1, limit: 20 });
    expect(resultado.items).toEqual([{ id: 'tx-1' }]);

    act(() => tree.unmount());
    queryClient.clear();
});

it('useInfiniteAdvances("open") pede só PENDING e PARTIAL; sem filtro, todos', async () => {
    mockGetAdvances.mockResolvedValue({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } });
    function ProbeAbertas() {
        useInfiniteAdvances('open');
        return null;
    }
    function ProbeTodas() {
        useInfiniteAdvances();
        return null;
    }
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
        tree = TestRenderer.create(
            <QueryClientProvider client={queryClient}>
                <ProbeAbertas />
                <ProbeTodas />
            </QueryClientProvider>,
        );
    });
    await settle();

    expect(mockGetAdvances).toHaveBeenCalledWith(1, 20, ['PENDING', 'PARTIAL']);
    expect(mockGetAdvances).toHaveBeenCalledWith(1, 20, undefined);

    act(() => tree.unmount());
    queryClient.clear();
});
