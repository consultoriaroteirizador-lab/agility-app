import { BaseResponse, MutationOptions, useMutationService } from '@/api'
import type { Id } from '@/types/base'

import type { ServiceResponse, ChangeServiceStatusRequest } from '../dto'
import { serviceService } from '../serviceService'

interface ChangeServiceStatusParams {
    id: Id
    payload: ChangeServiceStatusRequest
}

export function useChangeServiceStatus(options?: MutationOptions<BaseResponse<ServiceResponse>>) {
    const mutation = useMutationService<ServiceResponse, ChangeServiceStatusParams>({
        action: (request: ChangeServiceStatusParams) => serviceService.changeStatus(request.id, request.payload),
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        changeServiceStatus: (variables: ChangeServiceStatusParams) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}



