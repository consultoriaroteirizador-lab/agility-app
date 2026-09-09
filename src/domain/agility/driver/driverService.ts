import { BaseResponse } from '@/api'
import type { Id } from '@/types/base'

import { driverAPI, type DriverItem } from './driverAPI'
import type {
    CreateDriverRequest,
    UpdateDriverRequest,
    DriverResponse,
    DriverMeResponse,
} from './dto'

// Sobre `findAll`/`findByLicenseNumber`, que saíram daqui: ver driverAPI.ts.

async function create(payload: CreateDriverRequest): Promise<BaseResponse<DriverResponse>> {
    return driverAPI.create(payload)
}

async function findOne(id: Id): Promise<BaseResponse<DriverResponse>> {
    return driverAPI.findOne(id)
}

async function findByCollaboratorId(collaboratorId: Id): Promise<BaseResponse<DriverResponse | null>> {
    return driverAPI.findByCollaboratorId(collaboratorId)
}

async function getMe(): Promise<BaseResponse<DriverMeResponse>> {
    return driverAPI.getMe()
}

async function update(
    id: Id,
    payload: UpdateDriverRequest,
): Promise<BaseResponse<DriverResponse>> {
    return driverAPI.update(id, payload)
}

async function remove(id: Id): Promise<BaseResponse<void>> {
    return driverAPI.remove(id)
}

export type { DriverItem }
export const driverService = {
    create,
    findOne,
    findByCollaboratorId,
    getMe,
    update,
    remove,
}
