import { BaseResponse, PaginatedResult } from '@/api'
import { apiService } from '@/api/apiConfig'
import type { Id } from '@/types/base'

import type {
    CreateDriverRequest,
    UpdateDriverRequest,
    ListDriversRequest,
    DriverResponse,
    DriverMeResponse,
} from './dto'


// Export DriverResponse as DriverItem for backward compatibility
export type DriverItem = DriverResponse

type ListDriversParams = ListDriversRequest

async function create(payload: CreateDriverRequest): Promise<BaseResponse<DriverResponse>> {
    const { data } = await apiService.post<BaseResponse<DriverResponse>>('/drivers', payload)
    return data
}

// Sem teamCode o back retorna paginado ({ data, meta }); com teamCode retorna lista.
async function findAll(params: ListDriversParams = {}): Promise<BaseResponse<PaginatedResult<DriverResponse> | DriverResponse[]>> {
    const { data } = await apiService.get<BaseResponse<PaginatedResult<DriverResponse> | DriverResponse[]>>('/drivers', {
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

// Resolve o motorista logado independente do vínculo (Collaborator ou Provider).
// Substitui GET /collaborators/profile, que 404ava para o terceirizado.
async function getMe(): Promise<BaseResponse<DriverMeResponse>> {
    const { data } = await apiService.get<BaseResponse<DriverMeResponse>>('/drivers/me')
    return data
}

async function update(
    id: Id,
    payload: UpdateDriverRequest,
): Promise<BaseResponse<DriverResponse>> {
    const { data } = await apiService.patch<BaseResponse<DriverResponse>>(`/drivers/${id}`, payload)
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
    getMe,
    update,
    remove,
}
