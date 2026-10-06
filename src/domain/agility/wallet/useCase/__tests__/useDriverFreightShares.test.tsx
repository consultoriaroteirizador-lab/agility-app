import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TestRenderer, { act } from 'react-test-renderer';

import { moneyChangedKeys } from '@/domain/queryKeys';

import { useDriverFreightShares } from '../useDriverFreightShares';

const mockGetFreightShares = jest.fn();
jest.mock('../../walletAPI', () => ({
    walletAPI: { getFreightShares: (...args: unknown[]) => mockGetFreightShares(...args) },
}));
jest.mock('@/services', () => ({
    useAuthCredentialsService: () => ({ authCredentials: { accessToken: 't', tenantId: 'c-1' } }),
}));

let resultado!: ReturnType<typeof useDriverFreightShares>;
function Probe() {
    resultado = useDriverFreightShares({ routingId: 'r-1' });
    return null;
}

async function settle() {
    for (let i = 0; i < 10; i++) {
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });
    }
}

function montar(queryClient: QueryClient) {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
        tree = TestRenderer.create(
            <QueryClientProvider client={queryClient}>
                <Probe />
            </QueryClientProvider>,
        );
    });
    return tree;
}

const novoClient = () => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });

beforeEach(() => mockGetFreightShares.mockReset());

it('busca a 1ª página com o limite fixo e devolve a página', async () => {
    mockGetFreightShares.mockResolvedValue({ data: [{ id: 's-1' }], meta: { page: 1, totalPages: 1, total: 1 } });
    const queryClient = novoClient();
    const tree = montar(queryClient);
    await settle();

    expect(mockGetFreightShares).toHaveBeenCalledWith({ routingId: 'r-1', page: 1, limit: 50 });
    expect(resultado.page?.data).toHaveLength(1);

    act(() => tree.unmount());
    queryClient.clear();
});

it('erro não vira lista vazia: page null e isError', async () => {
    mockGetFreightShares.mockRejectedValue(new Error('rede'));
    const queryClient = novoClient();
    const tree = montar(queryClient);
    await settle();

    expect(resultado.page).toBeNull();
    expect(resultado.isError).toBe(true);

    act(() => tree.unmount());
    queryClient.clear();
});

it('mora sob [KEY_WALLET]: moneyChangedKeys() refaz a busca', async () => {
    mockGetFreightShares.mockResolvedValue({ data: [], meta: { page: 1, totalPages: 1, total: 0 } });
    const queryClient = novoClient();
    const tree = montar(queryClient);
    await settle();
    expect(mockGetFreightShares).toHaveBeenCalledTimes(1);

    await act(async () => {
        for (const queryKey of moneyChangedKeys()) {
            await queryClient.invalidateQueries({ queryKey });
        }
    });
    await settle();
    expect(mockGetFreightShares).toHaveBeenCalledTimes(2);

    act(() => tree.unmount());
    queryClient.clear();
});
