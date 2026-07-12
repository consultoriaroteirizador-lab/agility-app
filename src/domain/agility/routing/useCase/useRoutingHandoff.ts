import { BaseResponse, MutationOptions, useMutationService } from '@/api'
import type { Id } from '@/types/base'

import type { RoutingHandoffRequest, RoutingHandoffResult } from '../dto/request/routing-handoff.request'
import { routingService } from '../routingService'

export function useRoutingHandoff(options?: MutationOptions<BaseResponse<RoutingHandoffResult>>) {
    const mutation = useMutationService<RoutingHandoffResult, { id: Id; payload: RoutingHandoffRequest }>({
        action: ({ id, payload }) => routingService.handoff(id, payload),
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        handoff: (variables: { id: Id; payload: RoutingHandoffRequest }) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}
