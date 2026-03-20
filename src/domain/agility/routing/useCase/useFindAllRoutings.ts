import { useQuery } from '@tanstack/react-query'

import { KEY_ROUTINGS } from '@/domain/queryKeys'

import type { ListRoutingsRequest } from '../dto'
import { routingService } from '../routingService'

export function useFindAllRoutings(params?: ListRoutingsRequest) {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: [KEY_ROUTINGS, params?.status, params?.driverId, params?.date],
        queryFn: () => routingService.findAll(params || {}),
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



