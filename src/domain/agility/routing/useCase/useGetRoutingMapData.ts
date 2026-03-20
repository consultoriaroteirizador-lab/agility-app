import { useQuery } from '@tanstack/react-query'

import { KEY_ROUTINGS } from '@/domain/queryKeys'
import type { Id } from '@/types/base'

import { routingService } from '../routingService'

export function useGetRoutingMapData(routingId: Id) {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: [KEY_ROUTINGS, 'map-data', routingId],
        queryFn: () => routingService.getMapData(routingId),
        enabled: !!routingId,
        retry: false,
    })

    return {
        mapData: data?.result,
        services: data?.result?.services ?? [],
        routes: data?.result?.routes ?? [],
        origin: data?.result?.origin,
        isLoading,
        isError,
        refetch,
        isRefetching,
        response: data,
    }
}

