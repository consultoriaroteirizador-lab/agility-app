import { BaseResponse, MutationOptions, useMutationService } from '@/api'
import type { Id } from '@/types/base'

import { customerService } from '../customerService'

interface RemoveCustomerAddressParams {
    customerId: Id
    addressId: Id
}

export function useRemoveCustomerAddress(options?: MutationOptions<BaseResponse<void>>) {
    const mutation = useMutationService<void, RemoveCustomerAddressParams>({
        action: (request: RemoveCustomerAddressParams) => customerService.removeAddress(request.customerId, request.addressId),
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        removeCustomerAddress: (variables: RemoveCustomerAddressParams) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}

