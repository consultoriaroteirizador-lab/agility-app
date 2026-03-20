import { BaseResponse, MutationOptions, useMutationService } from '@/api'

import type { CreateRoutingRequest, RoutingResponse } from '../dto'
import { routingService } from '../routingService'

export function useCreateRouting(options?: MutationOptions<BaseResponse<RoutingResponse>>) {
    const mutation = useMutationService<RoutingResponse, CreateRoutingRequest>({
        action: (request: CreateRoutingRequest) => routingService.create(request),
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        createRouting: (variables: CreateRoutingRequest) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}



