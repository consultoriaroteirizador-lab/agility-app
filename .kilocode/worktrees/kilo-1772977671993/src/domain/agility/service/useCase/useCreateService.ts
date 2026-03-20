import { BaseResponse, MutationOptions, useMutationService } from '@/api'

import type { CreateServiceRequest, ServiceResponse } from '../dto'
import { serviceService } from '../serviceService'

export function useCreateService(options?: MutationOptions<BaseResponse<ServiceResponse>>) {
    const mutation = useMutationService<ServiceResponse, CreateServiceRequest>({
        action: (request: CreateServiceRequest) => serviceService.create(request),
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        createService: (variables: CreateServiceRequest) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}



