import { useQuery } from '@tanstack/react-query'

import { KEY_ROUTINGS } from '@/domain/queryKeys'

import { routingService } from '../routingService'

export function useCountRoutings(status?: string) {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: [KEY_ROUTINGS, 'count', status],
        queryFn: () => routingService.count(status),
        retry: false,
    })

    return {
        count: data?.result?.count ?? 0,
        isLoading,
        isError,
        refetch,
        isRefetching,
        response: data,
    }
}



