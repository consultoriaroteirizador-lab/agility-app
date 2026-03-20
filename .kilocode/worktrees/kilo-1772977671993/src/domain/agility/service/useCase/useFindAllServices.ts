import { useQuery } from '@tanstack/react-query'

import { KEY_SERVICES } from '@/domain/queryKeys'

import type { ListServicesRequest } from '../dto'
import { serviceService } from '../serviceService'

export function useFindAllServices(params?: ListServicesRequest) {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: [KEY_SERVICES, params?.orderId, params?.assignedToId, params?.page, params?.limit],
        queryFn: () => serviceService.findAll(params || {}),
        retry: false,
    })

    return {
        services: data?.result ?? [],
        isLoading,
        isError,
        refetch,
        isRefetching,
        response: data,
    }
}

