import { BaseResponse, MutationOptions, useMutationService } from '@/api'
import type { Id } from '@/types/base'

import { companyService } from '../companyService'
import type { CompanyResponse } from '../dto'

export function useActivateCompany(options?: MutationOptions<BaseResponse<CompanyResponse>>) {
    const mutation = useMutationService<CompanyResponse, Id>({
        action: (id: Id) => companyService.activate(id),
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        activateCompany: (variables: Id) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}

