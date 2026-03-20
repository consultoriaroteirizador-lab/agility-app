import { useQuery } from '@tanstack/react-query'

import { KEY_VEHICLES } from '@/domain/queryKeys'

import type { ListVehiclesRequest } from '../dto'
import { vehicleService } from '../vehicleService'

export function useFindAllVehicles(params?: ListVehiclesRequest) {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: [KEY_VEHICLES, params?.page, params?.limit],
        queryFn: () => vehicleService.findAll(params || {}),
        retry: false,
    })

    return {
        vehicles: data?.result ?? [],
        isLoading,
        isError,
        refetch,
        isRefetching,
        response: data,
    }
}

