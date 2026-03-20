import { BaseResponse, MutationOptions, useMutationService } from '@/api'
import type { Id } from '@/types/base'

import { companyService } from '../companyService'

export function useRemoveCompany(options?: MutationOptions<BaseResponse<void>>) {
    const mutation = useMutationService<void, Id>({
        action: (id: Id) => companyService.remove(id),
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        removeCompany: (variables: Id) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}

