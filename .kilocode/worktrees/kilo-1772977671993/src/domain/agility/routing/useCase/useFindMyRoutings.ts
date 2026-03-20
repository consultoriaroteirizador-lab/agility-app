import { useQuery } from '@tanstack/react-query'

import { KEY_ROUTINGS } from '@/domain/queryKeys'

import type { ListRoutingsRequest } from '../dto'
import { routingService } from '../routingService'

const isDevelopment = __DEV__;

export function useFindMyRoutings(params?: ListRoutingsRequest) {
    const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
        queryKey: [KEY_ROUTINGS, 'my-routings', params?.status],
        queryFn: async () => {
            if (isDevelopment) {
                console.log('[useFindMyRoutings] Iniciando busca de rotas com params:', params);
            }
            try {
                const result = await routingService.findMyRoutings(params);
                if (isDevelopment) {
                    console.log('[useFindMyRoutings] Resposta do service:', JSON.stringify(result, null, 2));
                    console.log('[useFindMyRoutings] result.result:', result?.result);
                    console.log('[useFindMyRoutings] result.result é array?', Array.isArray(result?.result));
                    console.log('[useFindMyRoutings] result.result length:', result?.result?.length);
                }
                return result;
            } catch (err) {
                if (isDevelopment) {
                    console.error('[useFindMyRoutings] Erro ao buscar rotas:', err);
                }
                throw err;
            }
        },
        retry: false,
    })

    const routings = Array.isArray(data?.result) ? (data?.result ?? []) : [];

    if (isDevelopment) {
        console.log('[useFindMyRoutings] Hook state:', {
            isLoading,
            isError,
            error: error?.message,
            dataExists: !!data,
            dataResultExists: !!data?.result,
            dataResultIsArray: Array.isArray(data?.result),
            routingsCount: routings.length,
        });
    }

    return {
        routings,
        isLoading,
        isError,
        error,
        refetch,
        isRefetching,
        response: data,
    }
}