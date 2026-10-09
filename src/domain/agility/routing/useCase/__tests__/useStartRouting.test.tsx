/**
 * Iniciar a rota muda o status dela. A tela da oferta deixa `[KEY_ROUTINGS, id]` em cache como
 * ASSIGNED (fresco por 5 min), e a tela da rota lê dessa chave: sem invalidar, a parada não
 * abria até recarregar o app (rodada de 09/10/2026).
 */
import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TestRenderer, { act } from 'react-test-renderer';

import { KEY_ROUTINGS } from '@/domain/queryKeys';

import { useStartRouting } from '../useStartRouting';

let mockConfig: { onSuccess?: (data: unknown) => unknown } = {};
jest.mock('@/api', () => ({
    useMutationService: (config: { onSuccess?: (data: unknown) => unknown }) => {
        mockConfig = config;
        return { mutate: jest.fn(), isLoading: false, isSuccess: false, isError: false };
    },
}));
jest.mock('../../routingService', () => ({ routingService: { start: jest.fn() } }));

it('no sucesso, invalida a rota e as listas de rotas antes do onSuccess de quem chamou', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
    queryClient.setQueryData([KEY_ROUTINGS, 'rota-1'], { result: { status: 'ASSIGNED' } });
    queryClient.setQueryData([KEY_ROUTINGS, 'my-routings', 'ASSIGNED'], { result: [] });
    const onSuccess = jest.fn(() => {
        expect(queryClient.getQueryState([KEY_ROUTINGS, 'rota-1'])?.isInvalidated).toBe(true);
    });

    function Probe() {
        useStartRouting({ onSuccess });
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
    expect(queryClient.getQueryState([KEY_ROUTINGS, 'my-routings', 'ASSIGNED'])?.isInvalidated).toBe(true);

    act(() => tree.unmount());
    queryClient.clear();
});
