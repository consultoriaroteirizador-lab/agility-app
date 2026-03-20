import { BaseResponse, MutationOptions, useMutationService } from '@/api'
import type { Id } from '@/types/base'

import type { UpdateServiceRequest, ServiceResponse } from '../dto'
import { serviceService } from '../serviceService'

interface UpdateServiceParams {
    id: Id
    payload: UpdateServiceRequest
}

export function useUpdateService(options?: MutationOptions<BaseResponse<ServiceResponse>>) {
    const mutation = useMutationService<ServiceResponse, UpdateServiceParams>({
        action: (request: UpdateServiceParams) => serviceService.update(request.id, request.payload),
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        updateService: (variables: UpdateServiceParams) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}



