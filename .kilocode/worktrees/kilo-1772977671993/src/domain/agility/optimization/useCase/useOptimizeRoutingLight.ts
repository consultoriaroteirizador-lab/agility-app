import { useMutation, useQueryClient } from '@tanstack/react-query'

import { KEY_ROUTINGS } from '@/domain/queryKeys'

import type { OptimizeRoutingRequest } from '../dto'
import { optimizationService } from '../optimizationService'

export function useOptimizeRoutingLight() {
    const queryClient = useQueryClient()

    const mutation = useMutation({
        mutationFn: (payload: OptimizeRoutingRequest) => optimizationService.optimizeLight(payload),
        onSuccess: (data) => {
            // Invalidate routing queries to refresh data after optimization
            if (data?.result?.routingId) {
                queryClient.invalidateQueries({ queryKey: [KEY_ROUTINGS, data.result.routingId] })
                queryClient.invalidateQueries({ queryKey: [KEY_ROUTINGS, 'map-data', data.result.routingId] })
            }
        },
    })

    return {
        optimizeLight: mutation.mutate,
        optimizeLightAsync: mutation.mutateAsync,
        isLoading: mutation.isPending,
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
        error: mutation.error,
        data: mutation.data?.result,
        orderedPoints: mutation.data?.result?.orderedPoints ?? [],
        routes: mutation.data?.result?.routes ?? [],
        response: mutation.data,
        reset: mutation.reset,
    }
}

