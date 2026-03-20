import { useQuery } from '@tanstack/react-query'

import { KEY_SERVICES } from '@/domain/queryKeys'

import { serviceService } from '../serviceService'

export function useFindServicesByRoutingId(routingId: string | undefined) {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: [KEY_SERVICES, 'routing', routingId],
        queryFn: () => serviceService.findByRoutingId(routingId!),
        enabled: !!routingId,
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