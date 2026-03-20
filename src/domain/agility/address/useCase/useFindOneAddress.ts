import { useQuery } from '@tanstack/react-query'

import { KEY_ADDRESSES } from '@/domain/queryKeys'
import type { Id } from '@/types/base'

import { addressService } from '../addressService'

export function useFindOneAddress(id: Id | null | undefined) {
    const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
        queryKey: [KEY_ADDRESSES, id],
        queryFn: () => addressService.findOne(id!),
        enabled: !!id,
        retry: false,
    })

    return {
        address: data?.result ?? null,
        isLoading,
        isError,
        error,
        refetch,
        isRefetching,
        response: data,
    }
}

