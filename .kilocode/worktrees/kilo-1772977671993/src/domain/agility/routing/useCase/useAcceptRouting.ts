import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { BaseResponse } from '@/api'
import { KEY_ROUTINGS } from '@/domain/queryKeys'
import type { Id } from '@/types/base'

import type { AcceptRoutingRequest, RoutingResponse } from '../dto'
import { routingService } from '../routingService'


export function useAcceptRouting() {
    const queryClient = useQueryClient()

    const mutation = useMutation({
        mutationFn: ({ routingId, payload }: { routingId: Id; payload?: AcceptRoutingRequest }) =>
            routingService.acceptRouting(routingId, payload),
        onSuccess: (data: BaseResponse<RoutingResponse>) => {
            // Invalidate broadcasting and my-routings queries
            if (data?.result?.id) {
                queryClient.invalidateQueries({ queryKey: [KEY_ROUTINGS, 'broadcasting'] })
                queryClient.invalidateQueries({ queryKey: [KEY_ROUTINGS, 'my-routings'] })
                queryClient.invalidateQueries({ queryKey: [KEY_ROUTINGS, data.result.id] })
            }
        },
    })

    return {
        acceptRouting: mutation.mutate,
        acceptRoutingAsync: mutation.mutateAsync,
        isLoading: mutation.isPending,
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
        error: mutation.error,
        data: mutation.data?.result,
        response: mutation.data,
        reset: mutation.reset,
    }
}

