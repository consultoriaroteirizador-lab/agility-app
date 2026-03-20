import { BaseResponse, MutationOptions, useMutationService } from '@/api'

import { driverService } from '../driverService'
import type { CreateDriverRequest, DriverResponse } from '../dto'

export function useCreateDriver(options?: MutationOptions<BaseResponse<DriverResponse>>) {
    const mutation = useMutationService<DriverResponse, CreateDriverRequest>({
        action: (request: CreateDriverRequest) => driverService.create(request),
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        createDriver: (variables: CreateDriverRequest) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}

