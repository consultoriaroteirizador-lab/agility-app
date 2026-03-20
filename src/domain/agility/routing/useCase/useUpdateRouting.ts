import { BaseResponse, MutationOptions, useMutationService } from '@/api'
import type { Id } from '@/types/base'

import type { UpdateRoutingRequest, RoutingResponse } from '../dto'
import { routingService } from '../routingService'

interface UpdateRoutingParams {
    id: Id
    payload: UpdateRoutingRequest
}

export function useUpdateRouting(options?: MutationOptions<BaseResponse<RoutingResponse>>) {
    const mutation = useMutationService<RoutingResponse, UpdateRoutingParams>({
        action: (request: UpdateRoutingParams) => routingService.update(request.id, request.payload),
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        updateRouting: (variables: UpdateRoutingParams) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}



