import { useQuery } from '@tanstack/react-query'

import { KEY_CUSTOMERS } from '@/domain/queryKeys'
import type { Id } from '@/types/base'

import { customerService } from '../customerService'

export function useListCustomerAddresses(customerId: Id | null | undefined) {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: [KEY_CUSTOMERS, customerId, 'addresses'],
        queryFn: () => customerService.listAddresses(customerId!),
        enabled: !!customerId,
        retry: false,
    })

    return {
        addresses: data?.result ?? [],
        isLoading,
        isError,
        refetch,
        isRefetching,
        response: data,
    }
}

