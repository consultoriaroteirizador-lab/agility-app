import { useQuery } from '@tanstack/react-query'

import { KEY_DRIVER } from '@/domain/queryKeys'

import { driverService } from '../driverService'
import type { ListDriversRequest } from '../dto'

export function useFindAllDrivers(params?: ListDriversRequest) {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: [KEY_DRIVER, params?.teamCode],
        queryFn: () => driverService.findAll(params || {}),
        retry: false,
    })

    const result = data?.result
    const drivers = Array.isArray(result) ? result : result?.data ?? []

    return {
        drivers,
        isLoading,
        isError,
        refetch,
        isRefetching,
        response: data,
    }
}

