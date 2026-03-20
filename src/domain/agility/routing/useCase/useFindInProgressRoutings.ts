import { useQuery } from '@tanstack/react-query'

import { KEY_ROUTINGS } from '@/domain/queryKeys'

import { routingService } from '../routingService'

export function useFindInProgressRoutings() {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: [KEY_ROUTINGS, 'in-progress'],
        queryFn: () => routingService.findInProgress(),
        retry: false,
    })

    return {
        routings: data?.result ?? [],
        isLoading,
        isError,
        refetch,
        isRefetching,
        response: data,
    }
}



