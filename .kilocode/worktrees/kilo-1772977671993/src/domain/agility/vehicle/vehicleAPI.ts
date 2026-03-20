import { BaseResponse } from '@/api'
import { apiService } from '@/api/apiConfig'
import type { Id } from '@/types/base'

import type {
    CreateVehicleRequest,
    UpdateVehicleRequest,
    ListVehiclesRequest,
    VehicleResponse,
} from './dto'


// Export VehicleResponse as VehicleItem for backward compatibility
export type VehicleItem = VehicleResponse

async function create(payload: CreateVehicleRequest): Promise<BaseResponse<VehicleResponse>> {
    const { data } = await apiService.post<BaseResponse<VehicleResponse>>('/vehicles', payload)
    return data
}

async function findAll(params: ListVehiclesRequest = {}): Promise<BaseResponse<VehicleResponse[]>> {
    const { data } = await apiService.get<BaseResponse<VehicleResponse[]>>('/vehicles', {
        params: {
            ...(params.page && { page: params.page }),
            ...(params.limit && { limit: params.limit }),
        },
    })
    return data
}

async function findOne(id: Id): Promise<BaseResponse<VehicleResponse>> {
    const { data } = await apiService.get<BaseResponse<VehicleResponse>>(`/vehicles/${id}`)
    return data
}

async function findByPlate(plate: string): Promise<BaseResponse<VehicleResponse>> {
    const { data } = await apiService.get<BaseResponse<VehicleResponse>>(`/vehicles/plate/${plate}`)
    return data
}

async function update(
    id: Id,
    payload: UpdateVehicleRequest,
): Promise<BaseResponse<VehicleResponse>> {
    const { data } = await apiService.patch<BaseResponse<VehicleResponse>>(`/vehicles/${id}`, payload)
    return data
}

async function remove(id: Id): Promise<BaseResponse<void>> {
    const { data } = await apiService.delete<BaseResponse<void>>(`/vehicles/${id}`)
    return data
}

export const vehicleAPI = {
    create,
    findAll,
    findOne,
    findByPlate,
    update,
    remove,
}

