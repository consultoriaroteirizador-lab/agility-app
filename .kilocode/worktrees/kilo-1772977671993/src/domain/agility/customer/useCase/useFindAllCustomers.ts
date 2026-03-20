import { useQuery } from '@tanstack/react-query'

import { KEY_CUSTOMERS } from '@/domain/queryKeys'

import { customerService } from '../customerService'
import type { ListCustomersRequest } from '../dto'

export function useFindAllCustomers(params?: ListCustomersRequest) {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: [KEY_CUSTOMERS, params?.type],
        queryFn: () => customerService.findAll(params || {}),
        retry: false,
    })

    return {
        customers: data?.result ?? [],
        isLoading,
        isError,
        refetch,
        isRefetching,
        response: data,
    }
}

