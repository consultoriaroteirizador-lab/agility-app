import { BaseResponse, MutationOptions, useMutationService } from '@/api'
import type { Id } from '@/types/base'

import type { ServiceResponse, ServiceFailRequest } from '../dto'
import { serviceService } from '../serviceService'

interface FailServiceParams {
    id: Id
    payload: ServiceFailRequest
}

export function useFailService(options?: MutationOptions<BaseResponse<ServiceResponse>>) {
    const mutation = useMutationService<ServiceResponse, FailServiceParams>({
        action: (request: FailServiceParams) => serviceService.fail(request.id, request.payload),
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        failService: (variables: FailServiceParams) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}
