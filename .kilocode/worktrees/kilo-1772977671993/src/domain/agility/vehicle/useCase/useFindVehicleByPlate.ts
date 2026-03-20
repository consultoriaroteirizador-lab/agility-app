import { useQuery } from '@tanstack/react-query'

import { KEY_VEHICLES } from '@/domain/queryKeys'

import { vehicleService } from '../vehicleService'

export function useFindVehicleByPlate(plate: string | null | undefined) {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: [KEY_VEHICLES, 'plate', plate],
        queryFn: () => vehicleService.findByPlate(plate!),
        enabled: !!plate,
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



