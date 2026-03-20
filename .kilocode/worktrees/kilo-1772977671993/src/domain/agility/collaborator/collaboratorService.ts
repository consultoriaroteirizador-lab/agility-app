import { BaseResponse } from '@/api'
import type { Id } from '@/types/base'

import { collaboratorAPI, type Collaborator } from './collaboratorAPI'
import type {
    CreateCollaboratorRequest,
    UpdateCollaboratorRequest,
    ListCollaboratorsRequest,
    CollaboratorResponse,
} from './dto'

type ListCollaboratorsParams = ListCollaboratorsRequest

async function create(
    payload: CreateCollaboratorRequest,
): Promise<BaseResponse<CollaboratorResponse>> {
    return collaboratorAPI.create(payload)
}

async function findAll(
    params: ListCollaboratorsParams = {},
): Promise<BaseResponse<CollaboratorResponse[]>> {
    return collaboratorAPI.findAll(params)
}

async function findOne(id: Id): Promise<BaseResponse<CollaboratorResponse>> {
    return collaboratorAPI.findOne(id)
}

async function findByKeycloakUserId(
    keycloakUserId: Id,
): Promise<BaseResponse<CollaboratorResponse>> {
    return collaboratorAPI.findByKeycloakUserId(keycloakUserId)
}

async function getProfile(): Promise<BaseResponse<CollaboratorResponse>> {
    return collaboratorAPI.getProfile()
}

async function updateProfile(payload: UpdateCollaboratorRequest): Promise<BaseResponse<CollaboratorResponse>> {
    return collaboratorAPI.updateProfile(payload)
}

async function update(
    id: Id,
    payload: UpdateCollaboratorRequest,
): Promise<BaseResponse<CollaboratorResponse>> {
    return collaboratorAPI.update(id, payload)
}

async function activate(id: Id): Promise<BaseResponse<CollaboratorResponse>> {
    return collaboratorAPI.activate(id)
}

async function deactivate(id: Id): Promise<BaseResponse<CollaboratorResponse>> {
    return collaboratorAPI.deactivate(id)
}

async function remove(id: Id): Promise<BaseResponse<void>> {
    return collaboratorAPI.remove(id)
}

export type { Collaborator }
export const collaboratorService = {
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

