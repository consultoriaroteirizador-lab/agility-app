import { BaseResponse, MutationOptions, useMutationService } from '@/api'
import type { Id } from '@/types/base'

import type { ServiceResponse, ServiceCompletionDetailsRequest } from '../dto'
import { serviceService } from '../serviceService'

interface CompleteServiceWithDetailsParams {
    id: Id
    details: ServiceCompletionDetailsRequest
}

export function useCompleteServiceWithDetails(options?: MutationOptions<BaseResponse<ServiceResponse>>) {
    const mutation = useMutationService<ServiceResponse, CompleteServiceWithDetailsParams>({
        action: (request: CompleteServiceWithDetailsParams) => serviceService.completeWithDetails(request.id, request.details),
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        completeServiceWithDetails: (variables: CompleteServiceWithDetailsParams) => mutation.mutate(variables),
        completeServiceWithDetailsAsync: (variables: CompleteServiceWithDetailsParams) => mutation.mutateAsync(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}



