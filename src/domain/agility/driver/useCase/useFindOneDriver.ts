import { useQuery } from '@tanstack/react-query'

import { KEY_DRIVERS } from '@/domain/queryKeys'
import type { Id } from '@/types/base'

import { driverService } from '../driverService'

export function useFindOneDriver(id: Id | null | undefined) {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: [KEY_DRIVERS, id],
        queryFn: () => driverService.findOne(id!),
        enabled: !!id,
        retry: false,
    })

    return {
        driver: data?.result ?? null,
        isLoading,
        isError,
        refetch,
        isRefetching,
        response: data,
    }
}

