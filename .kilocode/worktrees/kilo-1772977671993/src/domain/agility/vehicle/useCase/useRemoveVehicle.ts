import { BaseResponse, MutationOptions, useMutationService } from '@/api'
import type { Id } from '@/types/base'

import { vehicleService } from '../vehicleService'

export function useRemoveVehicle(options?: MutationOptions<BaseResponse<void>>) {
    const mutation = useMutationService<void, Id>({
        action: (id: Id) => vehicleService.remove(id),
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        removeVehicle: (variables: Id) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}



