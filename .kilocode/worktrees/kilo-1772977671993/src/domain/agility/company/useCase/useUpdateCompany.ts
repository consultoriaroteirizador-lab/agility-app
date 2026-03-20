import { BaseResponse, MutationOptions, useMutationService } from '@/api'
import type { Id } from '@/types/base'

import { companyService } from '../companyService'
import type { UpdateCompanyRequest, CompanyResponse } from '../dto'

interface UpdateCompanyParams {
    id: Id
    payload: UpdateCompanyRequest
}

export function useUpdateCompany(options?: MutationOptions<BaseResponse<CompanyResponse>>) {
    const mutation = useMutationService<CompanyResponse, UpdateCompanyParams>({
        action: (request: UpdateCompanyParams) => companyService.update(request.id, request.payload),
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        updateCompany: (variables: UpdateCompanyParams) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}

