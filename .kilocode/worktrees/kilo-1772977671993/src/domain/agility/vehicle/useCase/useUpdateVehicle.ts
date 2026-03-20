import { BaseResponse, MutationOptions, useMutationService } from '@/api'
import type { Id } from '@/types/base'

import type { UpdateVehicleRequest, VehicleResponse } from '../dto'
import { vehicleService } from '../vehicleService'

interface UpdateVehicleParams {
    id: Id
    payload: UpdateVehicleRequest
}

export function useUpdateVehicle(options?: MutationOptions<BaseResponse<VehicleResponse>>) {
    const mutation = useMutationService<VehicleResponse, UpdateVehicleParams>({
        action: (request: UpdateVehicleParams) => vehicleService.update(request.id, request.payload),
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        updateVehicle: (variables: UpdateVehicleParams) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}



