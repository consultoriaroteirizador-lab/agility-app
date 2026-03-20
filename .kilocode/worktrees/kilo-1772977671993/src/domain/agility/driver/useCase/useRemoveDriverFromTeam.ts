import { BaseResponse, MutationOptions, useMutationService } from '@/api'
import type { Id } from '@/types/base'

import { driverService } from '../driverService'
import type { DriverResponse } from '../dto'

export function useRemoveDriverFromTeam(options?: MutationOptions<BaseResponse<DriverResponse>>) {
    const mutation = useMutationService<DriverResponse, Id>({
        action: (id: Id) => driverService.removeFromTeam(id),
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        removeDriverFromTeam: (variables: Id) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}

