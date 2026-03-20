import { useQuery } from '@tanstack/react-query'

import { KEY_OPTIMIZATION } from '@/domain/queryKeys'

import { optimizationService } from '../optimizationService'

export function useCheckOrsHealth(enabled: boolean = true) {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: [KEY_OPTIMIZATION, 'ors-health'],
        queryFn: () => optimizationService.checkOrsHealth(),
        enabled,
        retry: false,
    })

    return {
        health: data?.result ?? null,
        isLoading,
        isError,
        refetch,
        isRefetching,
        response: data,
    }
}



