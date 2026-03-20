import { BaseResponse, MutationOptions, useMutationService } from '@/api'
import type { Id } from '@/types/base'

import type { RoutingResponse } from '../dto'
import { routingService } from '../routingService'

interface AssignDriverParams {
    routingId: Id
    driverId: Id
}

export function useAssignDriverToRouting(options?: MutationOptions<BaseResponse<RoutingResponse>>) {
    const mutation = useMutationService<RoutingResponse, AssignDriverParams>({
        action: (request: AssignDriverParams) => routingService.assignDriver(request.routingId, request.driverId),
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        assignDriverToRouting: (variables: AssignDriverParams) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}



