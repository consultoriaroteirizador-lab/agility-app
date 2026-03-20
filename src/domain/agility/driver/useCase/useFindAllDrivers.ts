import { useQuery } from '@tanstack/react-query'

import { KEY_DRIVERS } from '@/domain/queryKeys'

import { driverService } from '../driverService'
import type { ListDriversRequest } from '../dto'

export function useFindAllDrivers(params?: ListDriversRequest) {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: [KEY_DRIVERS, params?.teamCode, params?.page, params?.limit],
        queryFn: () => driverService.findAll(params || {}),
        retry: false,
    })

    return {
        drivers: data?.result ?? [],
        isLoading,
        isError,
        refetch,
        isRefetching,
        response: data,
    }
}

