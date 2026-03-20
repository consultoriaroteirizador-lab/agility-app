import { useQuery } from '@tanstack/react-query'

import { KEY_ADDRESSES } from '@/domain/queryKeys'

import { addressService } from '../addressService'
import type { ListAddressesRequest } from '../dto'

export function useFindAllAddresses(params?: ListAddressesRequest) {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: [KEY_ADDRESSES, params?.postalCode, params?.page, params?.limit],
        queryFn: () => addressService.findAll(params || {}),
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

