import { useQuery } from '@tanstack/react-query'

import { KEY_ROUTINGS } from '@/domain/queryKeys'

import type { BroadcastingQueryRequest } from '../dto'
import { routingService } from '../routingService'

export function useFindBroadcastingRoutings(
    params?: BroadcastingQueryRequest,
    opts?: { pollWhileAvailable?: boolean },
) {
    const { data, isLoading, isError, refetch, isRefetching, dataUpdatedAt } = useQuery({
        // toFixed(2) ~ 1 km de precisão: GPS oscilando não cria chave nova a cada fix.
        queryKey: [
            KEY_ROUTINGS,
            'broadcasting',
            params?.driverLatitude?.toFixed(2),
            params?.driverLongitude?.toFixed(2),
        ],
        queryFn: () => routingService.findBroadcasting(params),
        retry: 1,
        refetchOnWindowFocus: true,
        refetchInterval: opts?.pollWhileAvailable ? 25_000 : 60_000,
    })

    return {
        routings: data?.result ?? [],
        isLoading,
        isError,
        refetch,
        isRefetching,
        response: data,
        dataUpdatedAt,
    }
}


