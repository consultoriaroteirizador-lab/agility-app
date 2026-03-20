import { BaseResponse, MutationOptions, useMutationService } from '@/api'

import type { CreateVehicleRequest, VehicleResponse } from '../dto'
import { vehicleService } from '../vehicleService'

export function useCreateVehicle(options?: MutationOptions<BaseResponse<VehicleResponse>>) {
    const mutation = useMutationService<VehicleResponse, CreateVehicleRequest>({
        action: (request: CreateVehicleRequest) => vehicleService.create(request),
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        createVehicle: (variables: CreateVehicleRequest) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}



