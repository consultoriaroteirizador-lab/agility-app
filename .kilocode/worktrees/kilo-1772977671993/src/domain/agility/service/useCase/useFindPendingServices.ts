import { useQuery } from '@tanstack/react-query'

import { KEY_SERVICES } from '@/domain/queryKeys'

import { serviceService } from '../serviceService'

export function useFindPendingServices() {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: [KEY_SERVICES, 'pending'],
        queryFn: () => serviceService.findPending(),
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



