import { useQuery } from '@tanstack/react-query'

import { KEY_ROUTES } from '@/domain/queryKeys'
import type { Id, PaginationQuery } from '@/types/base'

import { routeService } from '../routeService'

export function useFindAllRoutes(params?: PaginationQuery & { driverId?: Id; vehicleId?: Id }) {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: [KEY_ROUTES, params?.driverId, params?.vehicleId, params?.page, params?.limit],
        queryFn: () => routeService.findAll(params || {}),
        retry: false,
    })

    return {
        routes: data?.result ?? [],
        isLoading,
        isError,
        refetch,
        isRefetching,
        response: data,
    }
}

