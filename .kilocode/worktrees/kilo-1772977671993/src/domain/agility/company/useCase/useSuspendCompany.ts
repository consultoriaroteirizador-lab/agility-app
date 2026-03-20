import { BaseResponse, MutationOptions, useMutationService } from '@/api'
import type { Id } from '@/types/base'

import { companyService } from '../companyService'
import type { CompanyResponse } from '../dto'

export function useSuspendCompany(options?: MutationOptions<BaseResponse<CompanyResponse>>) {
    const mutation = useMutationService<CompanyResponse, Id>({
        action: (id: Id) => companyService.suspend(id),
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        suspendCompany: (variables: Id) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}

