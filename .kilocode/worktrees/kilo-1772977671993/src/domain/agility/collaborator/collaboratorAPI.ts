import { BaseResponse } from '@/api'
import { apiAgility } from '@/api/apiConfig'
import type { Id } from '@/types/base'

import type {
    CreateCollaboratorRequest,
    UpdateCollaboratorRequest,
    ListCollaboratorsRequest,
    CollaboratorResponse,
} from './dto'


// Export CollaboratorResponse as Collaborator for backward compatibility
export type Collaborator = CollaboratorResponse

type ListCollaboratorsParams = ListCollaboratorsRequest

async function create(payload: CreateCollaboratorRequest): Promise<BaseResponse<CollaboratorResponse>> {
    const { data } = await apiAgility.post<BaseResponse<CollaboratorResponse>>('/collaborators', payload)
    return data
}

async function findAll(
    params: ListCollaboratorsParams = {},
): Promise<BaseResponse<CollaboratorResponse[]>> {
    const { data } = await apiAgility.get<BaseResponse<CollaboratorResponse[]>>('/collaborators', {
        params: {
            ...(params.role && { role: params.role }),
            ...(params.department && { department: params.department }),
            ...(params.page && { page: params.page }),
            ...(params.limit && { limit: params.limit }),
        },
    })
    return data
}

async function findOne(id: Id): Promise<BaseResponse<CollaboratorResponse>> {
    const { data } = await apiAgility.get<BaseResponse<CollaboratorResponse>>(`/collaborators/${id}`)
    return data
}

async function findByKeycloakUserId(keycloakUserId: Id): Promise<BaseResponse<CollaboratorResponse>> {
    const { data } = await apiAgility.get<BaseResponse<CollaboratorResponse>>(`/collaborators/keycloak/${keycloakUserId}`)
    return data
}

async function getProfile(): Promise<BaseResponse<CollaboratorResponse>> {
    const { data } = await apiAgility.get<BaseResponse<CollaboratorResponse>>('/collaborators/profile')
    return data
}

async function updateProfile(payload: UpdateCollaboratorRequest): Promise<BaseResponse<CollaboratorResponse>> {
    const { data } = await apiAgility.patch<BaseResponse<CollaboratorResponse>>('/collaborators/profile', payload)
    return data
}

async function update(
    id: Id,
    payload: UpdateCollaboratorRequest,
): Promise<BaseResponse<CollaboratorResponse>> {
    const { data } = await apiAgility.patch<BaseResponse<CollaboratorResponse>>(`/collaborators/${id}`, payload)
    return data
}

async function activate(id: Id): Promise<BaseResponse<CollaboratorResponse>> {
    const { data } = await apiAgility.patch<BaseResponse<CollaboratorResponse>>(`/collaborators/${id}/activate`)
    return data
}

async function deactivate(id: Id): Promise<BaseResponse<CollaboratorResponse>> {
    const { data } = await apiAgility.patch<BaseResponse<CollaboratorResponse>>(`/collaborators/${id}/deactivate`)
    return data
}

async function remove(id: Id): Promise<BaseResponse<void>> {
    const { data } = await apiAgility.delete<BaseResponse<void>>(`/collaborators/${id}`)
    return data
}

export const collaboratorAPI = {
    create,
    findAll,
    findOne,
    findByKeycloakUserId,
    getProfile,
    updateProfile,
    update,
    activate,
    deactivate,
    remove,
}

