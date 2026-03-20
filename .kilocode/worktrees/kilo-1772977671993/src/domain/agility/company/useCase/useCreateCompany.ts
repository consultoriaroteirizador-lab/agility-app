import { BaseResponse, MutationOptions, useMutationService } from '@/api'

import { companyService } from '../companyService'
import type { CreateCompanyRequest, CompanyResponse } from '../dto'

export function useCreateCompany(options?: MutationOptions<BaseResponse<CompanyResponse>>) {
    const mutation = useMutationService<CompanyResponse, CreateCompanyRequest>({
        action: (request: CreateCompanyRequest) => companyService.create(request),
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        createCompany: (variables: CreateCompanyRequest) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}

