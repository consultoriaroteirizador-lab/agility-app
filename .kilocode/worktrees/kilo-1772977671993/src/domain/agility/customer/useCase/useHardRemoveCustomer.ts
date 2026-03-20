import { BaseResponse, MutationOptions, useMutationService } from '@/api'
import type { Id } from '@/types/base'

import { customerService } from '../customerService'

export function useHardRemoveCustomer(options?: MutationOptions<BaseResponse<void>>) {
    const mutation = useMutationService<void, Id>({
        action: (id: Id) => customerService.hardRemove(id),
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        hardRemoveCustomer: (variables: Id) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}

