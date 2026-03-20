import { BaseResponse } from '@/api'
import type { Id } from '@/types/base'

import { driverAPI, type DriverItem } from './driverAPI'
import type {
    CreateDriverRequest,
    UpdateDriverRequest,
    ListDriversRequest,
    DriverResponse,
    AssignDriverTeamRequest,
} from './dto'

type ListDriversParams = ListDriversRequest

async function create(payload: CreateDriverRequest): Promise<BaseResponse<DriverResponse>> {
    return driverAPI.create(payload)
}

async function findAll(params: ListDriversParams = {}): Promise<BaseResponse<DriverResponse[]>> {
    return driverAPI.findAll(params)
}

async function findOne(id: Id): Promise<BaseResponse<DriverResponse>> {
    return driverAPI.findOne(id)
}

async function findByCollaboratorId(collaboratorId: Id): Promise<BaseResponse<DriverResponse | null>> {
    return driverAPI.findByCollaboratorId(collaboratorId)
}

async function findByLicenseNumber(licenseNumber: string): Promise<BaseResponse<DriverResponse>> {
    return driverAPI.findByLicenseNumber(licenseNumber)
}

async function update(
    id: Id,
    payload: UpdateDriverRequest,
): Promise<BaseResponse<DriverResponse>> {
    return driverAPI.update(id, payload)
}

async function assignToTeam(
    id: Id,
    payload: AssignDriverTeamRequest,
): Promise<BaseResponse<DriverResponse>> {
    return driverAPI.assignToTeam(id, payload)
}

async function removeFromTeam(id: Id): Promise<BaseResponse<DriverResponse>> {
    return driverAPI.removeFromTeam(id)
}

async function remove(id: Id): Promise<BaseResponse<void>> {
    return driverAPI.remove(id)
}

export type { DriverItem }
export const driverService = {
    create,
    findAll,
    findOne,
    findByCollaboratorId,
    findByLicenseNumber,
    update,
    assignToTeam,
    removeFromTeam,
    remove,
}
