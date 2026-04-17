import { BaseResponse, MutationOptions, useMutationService } from '@/api'
import type { Id } from '@/types/base'

import { serviceService } from '../serviceService'

export function useRemoveService(options?: MutationOptions<BaseResponse<{ success: boolean; message: string }>>) {
    const mutation = useMutationService<{ success: boolean; message: string }, Id>({
        action: (id: Id) => serviceService.remove(id),
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        removeService: (variables: Id) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}



