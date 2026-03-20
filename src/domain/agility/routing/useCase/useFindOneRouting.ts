import { useQuery } from '@tanstack/react-query'

import { KEY_ROUTINGS } from '@/domain/queryKeys'
import type { Id } from '@/types/base'

import { routingService } from '../routingService'

export function useFindOneRouting(id: Id | null | undefined) {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: [KEY_ROUTINGS, id],
        queryFn: () => routingService.findById(id!),
        enabled: !!id,
        retry: false,
    })

    return {
        routing: data?.result ?? null,
        isLoading,
        isError,
        refetch,
        isRefetching,
        response: data,
    }
}



