import { BaseResponse } from '@/api'
import type { Id } from '@/types/base'

import type {
    CreateVehicleRequest,
    UpdateVehicleRequest,
    ListVehiclesRequest,
    VehicleResponse,
} from './dto'
import { vehicleAPI, type VehicleItem } from './vehicleAPI'

async function create(payload: CreateVehicleRequest): Promise<BaseResponse<VehicleResponse>> {
    return vehicleAPI.create(payload)
}

async function findAll(params: ListVehiclesRequest = {}): Promise<BaseResponse<VehicleResponse[]>> {
    return vehicleAPI.findAll(params)
}

async function findOne(id: Id): Promise<BaseResponse<VehicleResponse>> {
    return vehicleAPI.findOne(id)
}

async function findByPlate(plate: string): Promise<BaseResponse<VehicleResponse>> {
    return vehicleAPI.findByPlate(plate)
}

async function update(
    id: Id,
    payload: UpdateVehicleRequest,
): Promise<BaseResponse<VehicleResponse>> {
    return vehicleAPI.update(id, payload)
}

async function remove(id: Id): Promise<BaseResponse<void>> {
    return vehicleAPI.remove(id)
}

export type { VehicleItem }
export const vehicleService = {
    create,
    findAll,
    findOne,
    findByPlate,
    update,
    remove,
}
