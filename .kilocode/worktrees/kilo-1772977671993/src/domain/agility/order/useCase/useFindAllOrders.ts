import { useQuery } from '@tanstack/react-query'

import { KEY_ORDERS } from '@/domain/queryKeys'
import type { PaginationQuery, Id } from '@/types/base'

import { listOrdersService } from '../orderService'

export function useFindAllOrders(params?: PaginationQuery & { customerId?: Id; status?: string }) {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: [KEY_ORDERS, params?.customerId, params?.status, params?.page, params?.limit],
        queryFn: () => listOrdersService(params || {}),
        retry: false,
    })

    return {
        orders: data?.result ?? [],
        isLoading,
        isError,
        refetch,
        isRefetching,
        response: data,
    }
}

