import { BaseResponse } from '@/api'
import { apiService } from '@/api/apiConfig'
import type { Id } from '@/types/base'

import type {
    CreateDriverRequest,
    UpdateDriverRequest,
    DriverResponse,
    DriverMeResponse,
} from './dto'


// Export DriverResponse as DriverItem for backward compatibility
export type DriverItem = DriverResponse

/**
 * NÃO reintroduzir `findAll` (GET /drivers) nem `findByLicenseNumber`
 * (GET /drivers/license/:cnh) aqui. As duas saíram de `@Roles('COLLABORATOR')`
 * no backend (PR #613) e hoje respondem 403 para motorista — davam a qualquer
 * motorista a lista de colegas e a busca de cadastro pelo número da CNH.
 * Nenhuma tela as montava; ficavam vivas só pelo re-export do barrel.
 * Para o cadastro do próprio motorista, use `getMe` (GET /drivers/me).
 */

async function create(payload: CreateDriverRequest): Promise<BaseResponse<DriverResponse>> {
    const { data } = await apiService.post<BaseResponse<DriverResponse>>('/drivers', payload)
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
    findOne,
    findByCollaboratorId,
    getMe,
    update,
    remove,
}
