import { useQuery } from '@tanstack/react-query'

import { KEY_VEHICLES } from '@/domain/queryKeys'
import type { Id } from '@/types/base'

import { vehicleService } from '../vehicleService'

export function useFindOneVehicle(id: Id | null | undefined) {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: [KEY_VEHICLES, id],
        queryFn: () => vehicleService.findOne(id!),
        enabled: !!id,
        retry: false,
    })

    return {
        vehicle: data?.result ?? null,
        isLoading,
        isError,
        refetch,
        isRefetching,
        response: data,
    }
}



