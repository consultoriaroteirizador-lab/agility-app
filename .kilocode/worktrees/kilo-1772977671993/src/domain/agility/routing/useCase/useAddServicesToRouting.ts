import { BaseResponse, MutationOptions, useMutationService } from '@/api'
import type { Id } from '@/types/base'

import type { AddServicesToRoutingRequest, AddServicesToRoutingResponse } from '../dto'
import { routingService } from '../routingService'

interface AddServicesToRoutingVariables {
    routingId: Id
    payload: AddServicesToRoutingRequest
}

export function useAddServicesToRouting(options?: MutationOptions<BaseResponse<AddServicesToRoutingResponse>>) {
    const mutation = useMutationService<AddServicesToRoutingResponse, AddServicesToRoutingVariables>({
        action: (variables: AddServicesToRoutingVariables) => 
            routingService.addServices(variables.routingId, variables.payload),
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        addServicesToRouting: (routingId: Id, payload: AddServicesToRoutingRequest) => 
            mutation.mutate({ routingId, payload }),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}

