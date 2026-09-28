import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TestRenderer, { act } from 'react-test-renderer';

import { useInfiniteTransactions } from '../useInfiniteWalletLists';

const mockGetTransactions = jest.fn();
jest.mock('../../walletAPI', () => ({
    walletAPI: { getTransactions: (...args: unknown[]) => mockGetTransactions(...args) },
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
