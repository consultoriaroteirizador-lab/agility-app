import { BaseResponse, MutationOptions, useMutationService } from '@/api'
import type { Id } from '@/types/base'

import { customerService } from '../customerService'
import type { CreateCustomerAddressRequest, CustomerAddressResponse } from '../dto'

interface AddCustomerAddressParams {
    customerId: Id
    payload: CreateCustomerAddressRequest
}

export function useAddCustomerAddress(options?: MutationOptions<BaseResponse<CustomerAddressResponse>>) {
    const mutation = useMutationService<CustomerAddressResponse, AddCustomerAddressParams>({
        action: (request: AddCustomerAddressParams) => customerService.addAddress(request.customerId, request.payload),
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        addCustomerAddress: (variables: AddCustomerAddressParams) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}

