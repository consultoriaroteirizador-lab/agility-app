import { BaseResponse, MutationOptions, useMutationService } from '@/api'
import type { Id } from '@/types/base'

import { customerService } from '../customerService'
import type { UpdateCustomerAddressRequest, CustomerAddressResponse } from '../dto'

interface UpdateCustomerAddressParams {
    customerId: Id
    addressId: Id
    payload: UpdateCustomerAddressRequest
}

export function useUpdateCustomerAddress(options?: MutationOptions<BaseResponse<CustomerAddressResponse>>) {
    const mutation = useMutationService<CustomerAddressResponse, UpdateCustomerAddressParams>({
        action: (request: UpdateCustomerAddressParams) => customerService.updateAddress(request.customerId, request.addressId, request.payload),
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        updateCustomerAddress: (variables: UpdateCustomerAddressParams) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}

