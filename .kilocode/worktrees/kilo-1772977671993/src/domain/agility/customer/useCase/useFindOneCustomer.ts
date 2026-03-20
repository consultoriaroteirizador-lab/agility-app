import { useQuery } from '@tanstack/react-query'

import { KEY_CUSTOMERS } from '@/domain/queryKeys'
import type { Id } from '@/types/base'

import { customerService } from '../customerService'

export function useFindOneCustomer(id: Id | null | undefined) {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: [KEY_CUSTOMERS, id],
        queryFn: () => customerService.findOne(id!),
        enabled: !!id,
        retry: false,
    })

    return {
        customer: data?.result ?? null,
        isLoading,
        isError,
        refetch,
        isRefetching,
        response: data,
    }
}

