import { BaseResponse, MutationOptions, useMutationService } from '@/api'
import type { Id } from '@/types/base'

import { addressService } from '../addressService'
import type { UpdateAddressRequest, AddressResponse } from '../dto'

interface UpdateAddressParams {
    id: Id
    payload: UpdateAddressRequest
}

export function useUpdateAddress(options?: MutationOptions<BaseResponse<AddressResponse>>) {
    const mutation = useMutationService<AddressResponse, UpdateAddressParams>({
        action: (request: UpdateAddressParams) => addressService.update(request.id, request.payload),
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        updateAddress: (variables: UpdateAddressParams) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}

