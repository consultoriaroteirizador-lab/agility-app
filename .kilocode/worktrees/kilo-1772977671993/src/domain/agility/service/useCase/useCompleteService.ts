import { BaseResponse, MutationOptions, useMutationService } from '@/api'
import type { Id } from '@/types/base'

import type { ServiceResponse } from '../dto'
import { serviceService } from '../serviceService'

interface CompleteServiceParams {
    id: Id
    completionNotes?: string
}

export function useCompleteService(options?: MutationOptions<BaseResponse<ServiceResponse>>) {
    const mutation = useMutationService<ServiceResponse, CompleteServiceParams>({
        action: (request: CompleteServiceParams) => serviceService.complete(request.id, request.completionNotes),
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        completeService: (variables: CompleteServiceParams) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}



