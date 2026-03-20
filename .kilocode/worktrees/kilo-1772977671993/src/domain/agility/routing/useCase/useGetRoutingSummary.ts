import { useQuery } from '@tanstack/react-query'

import { KEY_ROUTINGS } from '@/domain/queryKeys'
import type { Id } from '@/types/base'

import { routingService } from '../routingService'

export function useGetRoutingSummary(routingId: Id) {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: [KEY_ROUTINGS, 'summary', routingId],
        queryFn: () => routingService.getSummary(routingId),
        enabled: !!routingId,
        retry: false,
    })

    return {
        summary: data?.result,
        isLoading,
        isError,
        refetch,
        isRefetching,
        response: data,
    }
}

