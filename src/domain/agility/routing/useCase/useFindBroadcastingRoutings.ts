import { useQuery } from '@tanstack/react-query'

import { KEY_ROUTINGS } from '@/domain/queryKeys'

import type { BroadcastingQueryRequest } from '../dto'
import { routingService } from '../routingService'

export function useFindBroadcastingRoutings(params?: BroadcastingQueryRequest) {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: [KEY_ROUTINGS, 'broadcasting', params?.driverLatitude, params?.driverLongitude],
        queryFn: () => routingService.findBroadcasting(params),
        retry: false,
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


