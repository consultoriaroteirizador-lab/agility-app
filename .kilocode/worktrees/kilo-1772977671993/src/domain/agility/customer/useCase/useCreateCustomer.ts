import { BaseResponse, MutationOptions, useMutationService } from '@/api'

import { customerService } from '../customerService'
import type { CreateCustomerRequest, CustomerResponse } from '../dto'

export function useCreateCustomer(options?: MutationOptions<BaseResponse<CustomerResponse>>) {
    const mutation = useMutationService<CustomerResponse, CreateCustomerRequest>({
        action: (request: CreateCustomerRequest) => customerService.create(request),
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        createCustomer: (variables: CreateCustomerRequest) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}

