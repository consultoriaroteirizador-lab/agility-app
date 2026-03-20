import { BaseResponse, MutationOptions, useMutationService } from '@/api'
import type { Id } from '@/types/base'

import { driverService } from '../driverService'

export function useRemoveDriver(options?: MutationOptions<BaseResponse<void>>) {
    const mutation = useMutationService<void, Id>({
        action: (id: Id) => driverService.remove(id),
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        removeDriver: (variables: Id) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}

