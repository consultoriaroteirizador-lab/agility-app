import { BaseResponse, MutationOptions, useMutationService } from '@/api'
import type { Id } from '@/types/base'

import type { RoutingResponse } from '../dto'
import { routingService } from '../routingService'

interface AssignVehicleParams {
    routingId: Id
    vehicleId: Id
}

export function useAssignVehicleToRouting(options?: MutationOptions<BaseResponse<RoutingResponse>>) {
    const mutation = useMutationService<RoutingResponse, AssignVehicleParams>({
        action: (request: AssignVehicleParams) => routingService.assignVehicle(request.routingId, request.vehicleId),
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        assignVehicleToRouting: (variables: AssignVehicleParams) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}



