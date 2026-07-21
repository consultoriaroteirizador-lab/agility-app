import { BaseResponse } from '@/api'
import { apiAgility } from '@/api/apiConfig'
import type { Id } from '@/types/base'

import type {
    CreateServiceRequest,
    CreateServicesBatchRequest,
    BatchCreationResult,
    UpdateServiceRequest,
    ListServicesRequest,
    ServiceResponse,
    ChangeServiceStatusRequest,
    ServiceCompletionDetailsRequest,
    ServiceFailRequest,
    ServiceDraftData,
    SaveServiceDraftRequest,
    SaveServiceDraftResponse,
    GetServiceDraftResponse,
    ApplyOccurrenceRequest,
    OccurrenceOutcome,
} from './dto'
import type {
    ServiceMaterialResponse,
    MaterialCheckRequest,
    MaterialCheckResponse,
    BatchMaterialCheckRequest,
    BatchMaterialCheckResponse,
} from './dto/response/service-material.response'


// Export ServiceResponse as ServiceItem for backward compatibility
export type ServiceItem = ServiceResponse

async function create(payload: CreateServiceRequest): Promise<BaseResponse<ServiceResponse>> {
    const { data } = await apiAgility.post<BaseResponse<ServiceResponse>>('/services', payload)
    return data
}

async function createBatch(payload: CreateServicesBatchRequest): Promise<BaseResponse<BatchCreationResult>> {
    const { data } = await apiAgility.post<BaseResponse<BatchCreationResult>>('/services/batch', payload)
    return data
}

async function findAll(params: ListServicesRequest = {}): Promise<BaseResponse<ServiceResponse[]>> {
    const { data } = await apiAgility.get<BaseResponse<ServiceResponse[]>>('/services', {
        params: {
            ...(params.assignedToId && { assignedToId: params.assignedToId }),
            ...(params.page && { page: params.page }),
            ...(params.limit && { limit: params.limit }),
        },
    })
    return data
}

async function findByRoutingId(routingId: string): Promise<BaseResponse<ServiceResponse[]>> {
    const { data } = await apiAgility.get<BaseResponse<ServiceResponse[]>>('/services', {
        params: { routingId },
    })
    return data
}

async function findPending(): Promise<BaseResponse<ServiceResponse[]>> {
    const { data } = await apiAgility.get<BaseResponse<ServiceResponse[]>>('/services/pending')
    return data
}

async function findOne(id: Id): Promise<BaseResponse<ServiceResponse>> {
    const { data } = await apiAgility.get<BaseResponse<ServiceResponse>>(`/services/${id}`)
    return data
}

async function update(
    id: Id,
    payload: UpdateServiceRequest,
): Promise<BaseResponse<ServiceResponse>> {
    const { data } = await apiAgility.patch<BaseResponse<ServiceResponse>>(`/services/${id}`, payload)
    return data
}

async function assignDriver(id: Id, driverId: Id): Promise<BaseResponse<ServiceResponse>> {
    const { data } = await apiAgility.patch<BaseResponse<ServiceResponse>>(`/services/${id}/assign/${driverId}`)
    return data
}

async function unassignDriver(id: Id): Promise<BaseResponse<ServiceResponse>> {
    const { data } = await apiAgility.patch<BaseResponse<ServiceResponse>>(`/services/${id}/unassign`)
    return data
}

async function start(id: Id): Promise<BaseResponse<ServiceResponse>> {
    const { data } = await apiAgility.patch<BaseResponse<ServiceResponse>>(`/services/${id}/start`)
    return data
}

async function startAttendance(
    id: Id,
    location?: { latitude?: number; longitude?: number; accuracy?: number },
): Promise<BaseResponse<ServiceResponse>> {
    const { data } = await apiAgility.patch<BaseResponse<ServiceResponse>>(`/services/${id}/start-attendance`, location ?? {})
    return data
}

async function complete(id: Id, completionNotes?: string): Promise<BaseResponse<ServiceResponse>> {
    const { data } = await apiAgility.patch<BaseResponse<ServiceResponse>>(`/services/${id}/complete`, {
        completionNotes,
    })
    return data
}

async function completeWithDetails(
    id: Id,
    details: ServiceCompletionDetailsRequest,
): Promise<BaseResponse<ServiceResponse>> {
    const { data } = await apiAgility.post<BaseResponse<ServiceResponse>>(`/services/${id}/completion-details`, details)
    return data
}

async function fail(id: Id, payload: ServiceFailRequest): Promise<BaseResponse<ServiceResponse>> {
    // Remover campos undefined do payload
    const cleanPayload = Object.entries(payload).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null) {
            acc[key] = value;
        }
        return acc;
    }, {} as Record<string, any>);

    const { data } = await apiAgility.post<BaseResponse<ServiceResponse>>(
        `/services/${id}/fail`,
        cleanPayload,
        {
            headers: {
                'Content-Type': 'application/json',
            },
        }
    )
    return data
}

async function applyOccurrence(
    id: Id,
    payload: ApplyOccurrenceRequest,
): Promise<BaseResponse<ServiceResponse & { occurrenceOutcome: OccurrenceOutcome }>> {
    // Remover campos undefined do payload
    const cleanPayload = Object.entries(payload).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null) {
            acc[key] = value;
        }
        return acc;
    }, {} as Record<string, any>);

    const { data } = await apiAgility.post<BaseResponse<ServiceResponse & { occurrenceOutcome: OccurrenceOutcome }>>(
        `/services/${id}/occurrence`,
        cleanPayload,
        {
            headers: {
                'Content-Type': 'application/json',
            },
        }
    )
    return data
}

async function changeStatus(
    id: Id,
    payload: ChangeServiceStatusRequest,
): Promise<BaseResponse<ServiceResponse>> {
    const { data } = await apiAgility.put<BaseResponse<ServiceResponse>>(`/services/${id}/status`, payload)
    return data
}

async function remove(id: Id): Promise<BaseResponse<{ success: boolean; message: string }>> {
    const { data } = await apiAgility.delete<BaseResponse<{ success: boolean; message: string }>>(`/services/${id}`)
    return data
}

interface BatchDeleteResult {
    deletedCount: number
    deletedIds: string[]
    failedIds: { id: string; error: string }[]
}

async function removeBatch(ids: string[]): Promise<BaseResponse<BatchDeleteResult>> {
    const { data } = await apiAgility.delete<BaseResponse<BatchDeleteResult>>('/services', {
        data: { ids },
    })
    return data
}

// ============================================
// MATERIALS API
// ============================================

async function getMaterials(serviceId: Id): Promise<BaseResponse<ServiceMaterialResponse[]>> {
    const { data } = await apiAgility.get<BaseResponse<ServiceMaterialResponse[]>>(
        `/services/${serviceId}/materials`
    )
    return data
}

async function checkMaterial(
    serviceId: Id,
    materialId: Id,
    payload: MaterialCheckRequest
): Promise<BaseResponse<MaterialCheckResponse>> {
    const { data } = await apiAgility.patch<BaseResponse<MaterialCheckResponse>>(
        `/services/${serviceId}/materials/${materialId}/check`,
        payload
    )
    return data
}

async function checkMaterialsBatch(
    serviceId: Id,
    payload: BatchMaterialCheckRequest
): Promise<BaseResponse<BatchMaterialCheckResponse>> {
    const { data } = await apiAgility.post<BaseResponse<BatchMaterialCheckResponse>>(
        `/services/${serviceId}/materials/check-batch`,
        payload
    )
    return data
}

// ============================================
// DRAFT (in-progress evidence) API
// ============================================

async function saveDraft(
    id: Id,
    draft: ServiceDraftData,
): Promise<BaseResponse<SaveServiceDraftResponse>> {
    const payload: SaveServiceDraftRequest = { data: draft }
    const { data } = await apiAgility.put<BaseResponse<SaveServiceDraftResponse>>(
        `/services/${id}/draft`,
        payload,
    )
    return data
}

async function getDraft(id: Id): Promise<BaseResponse<GetServiceDraftResponse>> {
    const { data } = await apiAgility.get<BaseResponse<GetServiceDraftResponse>>(
        `/services/${id}/draft`,
    )
    return data
}

async function clearDraft(id: Id): Promise<void> {
    await apiAgility.delete(`/services/${id}/draft`)
}

export const serviceAPI = {
    create,
    createBatch,
    findAll,
    findByRoutingId,
    findPending,
    findOne,
    update,
    assignDriver,
    unassignDriver,
    start,
    startAttendance,
    complete,
    completeWithDetails,
    fail,
    applyOccurrence,
    changeStatus,
    remove,
    removeBatch,
    // Materials
    getMaterials,
    checkMaterial,
    checkMaterialsBatch,
    // Draft
    saveDraft,
    getDraft,
    clearDraft,
}

