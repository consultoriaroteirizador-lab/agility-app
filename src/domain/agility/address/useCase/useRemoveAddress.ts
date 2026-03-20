import { BaseResponse, MutationOptions, useMutationService } from '@/api'
import type { Id } from '@/types/base'

import { addressService } from '../addressService'

export function useRemoveAddress(options?: MutationOptions<BaseResponse<void>>) {
    const mutation = useMutationService<void, Id>({
        action: (id: Id) => addressService.remove(id),
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        removeAddress: (variables: Id) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}

