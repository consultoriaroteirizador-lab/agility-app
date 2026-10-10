import { useCallback } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { erroTransitorio } from '@/api/apiErrorMessage';
import { KEY_FUEL_ENTRIES } from '@/domain/queryKeys';
import { useAuthCredentialsService } from '@/services';

import { fuelEntryAPI } from '../fuelEntryAPI';

const CONTEXT_KEY = [KEY_FUEL_ENTRIES, 'context'];

/**
 * Placa, combustível sugerido e último odômetro. 422 (sem veículo, veículo de outra filial, elétrico) é
 * resposta definitiva: sem retry, e o menu esconde o "Abastecer". Sem rede, timeout ou 5xx, tenta de novo:
 * o QueryClient do app não tem retry, foco nem onlineManager, e uma falha passageira virava definitiva.
 */
export function useFuelEntryContext() {
    const queryClient = useQueryClient();
    const { authCredentials } = useAuthCredentialsService();
    const isAuthenticated = !!authCredentials?.accessToken && !!authCredentials?.tenantId;
    const query = useQuery({
        queryKey: CONTEXT_KEY,
        queryFn: () => fuelEntryAPI.getContext(),
        enabled: isAuthenticated,
        retry: (failureCount, error) => erroTransitorio(error) && failureCount < 2,
        staleTime: 1000 * 60 * 5,
    });
    // Para o foco de tela (a aba do menu não desmonta): busca de novo só se a última busca falhou. Lê o estado
    // na hora da chamada, então a função não muda a cada render e o foco não vira busca em laço.
    const refetchIfFailed = useCallback(() => {
        if (queryClient.getQueryState(CONTEXT_KEY)?.status === 'error') {
            void queryClient.refetchQueries({ queryKey: CONTEXT_KEY, exact: true });
        }
    }, [queryClient]);
    return { context: query.data, isLoading: query.isLoading, isError: query.isError, error: query.error, refetch: query.refetch, refetchIfFailed };
}
