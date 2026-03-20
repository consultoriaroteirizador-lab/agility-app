import { BaseResponse, MutationOptions, useMutationService } from '@/api'
import type { Id } from '@/types/base'

import { customerService } from '../customerService'
import type { UpdateCustomerRequest, CustomerResponse } from '../dto'

interface UpdateCustomerParams {
    id: Id
    payload: UpdateCustomerRequest
}

export function useUpdateCustomer(options?: MutationOptions<BaseResponse<CustomerResponse>>) {
    const mutation = useMutationService<CustomerResponse, UpdateCustomerParams>({
        action: (request: UpdateCustomerParams) => customerService.update(request.id, request.payload),
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        updateCustomer: (variables: UpdateCustomerParams) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}

