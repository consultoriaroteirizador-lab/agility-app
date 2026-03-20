import { BaseResponse, MutationOptions, useMutationService } from '@/api'

import { addressService } from '../addressService'
import type { CreateAddressRequest, AddressResponse } from '../dto'

export function useCreateAddress(options?: MutationOptions<BaseResponse<AddressResponse>>) {
    const mutation = useMutationService<AddressResponse, CreateAddressRequest>({
        action: (request: CreateAddressRequest) => addressService.create(request),
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        createAddress: (variables: CreateAddressRequest) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}

