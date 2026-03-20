import { BaseResponse, MutationOptions, useMutationService } from '@/api'

import type { CreateServicesBatchRequest, BatchCreationResult } from '../dto'
import { serviceService } from '../serviceService'

export function useCreateServicesBatch(options?: MutationOptions<BaseResponse<BatchCreationResult>>) {
    const mutation = useMutationService<BatchCreationResult, CreateServicesBatchRequest>({
        action: (request: CreateServicesBatchRequest) => serviceService.createBatch(request),
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        createServicesBatch: (variables: CreateServicesBatchRequest) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}

