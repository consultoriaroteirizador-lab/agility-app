import { BaseResponse, MutationOptions, useMutationService } from '@/api'
import type { Id } from '@/types/base'

import type { ServiceResponse } from '../dto'
import { serviceService } from '../serviceService'

export function useStartService(options?: MutationOptions<BaseResponse<ServiceResponse>>) {
    const mutation = useMutationService<ServiceResponse, Id>({
        action: (id: Id) => serviceService.start(id),
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        startService: (variables: Id) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}



