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

    return {
        drivers: data?.result ?? [],
        isLoading,
        isError,
        refetch,
        isRefetching,
        response: data,
    }
}

