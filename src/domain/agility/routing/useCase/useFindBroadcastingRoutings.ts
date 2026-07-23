import { useQuery } from '@tanstack/react-query'

import { KEY_ROUTINGS } from '@/domain/queryKeys'

import type { BroadcastingQueryRequest } from '../dto'
import { routingService } from '../routingService'

export function useFindBroadcastingRoutings(
    params?: BroadcastingQueryRequest,
    opts?: { pollWhileAvailable?: boolean },
) {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: [KEY_ROUTINGS, 'broadcasting', params?.driverLatitude, params?.driverLongitude],
        queryFn: () => routingService.findBroadcasting(params),
        retry: 1,
        refetchInterval: opts?.pollWhileAvailable ? 25_000 : false,
    })

    return {
        routings: data?.result ?? [],
        isLoading,
        isError,
        refetch,
        isRefetching,
        response: data,
    }
}


