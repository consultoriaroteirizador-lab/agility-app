import { BaseResponse } from '@/api'
import { apiService } from '@/api/apiConfig'
import type { Id } from '@/types/base'

import type {
    CreateDriverRequest,
    UpdateDriverRequest,
    ListDriversRequest,
    DriverResponse,
    AssignDriverTeamRequest,
} from './dto'


// Export DriverResponse as DriverItem for backward compatibility
export type DriverItem = DriverResponse

type ListDriversParams = ListDriversRequest

async function create(payload: CreateDriverRequest): Promise<BaseResponse<DriverResponse>> {
    const { data } = await apiService.post<BaseResponse<DriverResponse>>('/drivers', payload)
    return data
}

async function findAll(params: ListDriversParams = {}): Promise<BaseResponse<DriverResponse[]>> {
    const { data } = await apiService.get<BaseResponse<DriverResponse[]>>('/drivers', {
        params: {
            ...(params.teamCode && { teamCode: params.teamCode }),
            ...(params.page && { page: params.page }),
            ...(params.limit && { limit: params.limit }),
        },
    })
    return data
}

async function findOne(id: Id): Promise<BaseResponse<DriverResponse>> {
    const { data } = await apiService.get<BaseResponse<DriverResponse>>(`/drivers/${id}`)
    return data
}

async function findByCollaboratorId(collaboratorId: Id): Promise<BaseResponse<DriverResponse | null>> {
    const { data } = await apiService.get<BaseResponse<DriverResponse | null>>(`/drivers/collaborator/${collaboratorId}`)
    return data
}

async function findByLicenseNumber(licenseNumber: string): Promise<BaseResponse<DriverResponse>> {
    const { data } = await apiService.get<BaseResponse<DriverResponse>>(`/drivers/license/${licenseNumber}`)
    return data
}

async function update(
    id: Id,
    payload: UpdateDriverRequest,
): Promise<BaseResponse<DriverResponse>> {
    const { data } = await apiService.patch<BaseResponse<DriverResponse>>(`/drivers/${id}`, payload)
    return data
}

async function assignToTeam(
    id: Id,
    payload: AssignDriverTeamRequest,
): Promise<BaseResponse<DriverResponse>> {
    const { data } = await apiService.patch<BaseResponse<DriverResponse>>(`/drivers/${id}/assign-team`, payload)
    return data
}

async function removeFromTeam(id: Id): Promise<BaseResponse<DriverResponse>> {
    const { data } = await apiService.patch<BaseResponse<DriverResponse>>(`/drivers/${id}/remove-team`)
    return data
}

async function remove(id: Id): Promise<BaseResponse<void>> {
    const { data } = await apiService.delete<BaseResponse<void>>(`/drivers/${id}`)
    return data
}

export const driverAPI = {
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
