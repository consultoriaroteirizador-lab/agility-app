import { BaseResponse, MutationOptions, useMutationService } from '@/api'
import type { Id } from '@/types/base'

import { driverService } from '../driverService'
import type { UpdateDriverRequest, DriverResponse } from '../dto'

interface UpdateDriverParams {
    id: Id
    payload: UpdateDriverRequest
}

export function useUpdateDriver(options?: MutationOptions<BaseResponse<DriverResponse>>) {
    const mutation = useMutationService<DriverResponse, UpdateDriverParams>({
        action: (request: UpdateDriverParams) => driverService.update(request.id, request.payload),
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        updateDriver: (variables: UpdateDriverParams) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}

