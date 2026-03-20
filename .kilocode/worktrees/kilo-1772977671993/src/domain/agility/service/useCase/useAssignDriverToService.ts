import { BaseResponse, MutationOptions, useMutationService } from '@/api'
import type { Id } from '@/types/base'

import type { ServiceResponse } from '../dto'
import { serviceService } from '../serviceService'

interface AssignDriverParams {
    serviceId: Id
    driverId: Id
}

export function useAssignDriverToService(options?: MutationOptions<BaseResponse<ServiceResponse>>) {
    const mutation = useMutationService<ServiceResponse, AssignDriverParams>({
        action: (request: AssignDriverParams) => serviceService.assignDriver(request.serviceId, request.driverId),
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        assignDriverToService: (variables: AssignDriverParams) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}



