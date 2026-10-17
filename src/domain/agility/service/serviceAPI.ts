import { BaseResponse } from '@/api'
import { apiAgility } from '@/api/apiConfig'
import type { Id } from '@/types/base'

import type {
    ListServicesRequest,
    ServiceResponse,
    ServiceCompletionDetailsRequest,
    ServiceFailRequest,
    ServiceDraftData,
    SaveServiceDraftRequest,
    SaveServiceDraftResponse,
    GetServiceDraftResponse,
    ApplyOccurrenceRequest,
    OccurrenceOutcome,
    DeliveryAttemptResponse,
} from './dto'
import type {
    ServiceLine,
    MaterialCheckRequest,
    MaterialCheckResponse,
    EquipmentLookupResponse,
    SwapLineRequest,
    SwapLineResponse,
} from './dto/response/service-line.response'
import type { ServiceType } from './dto/types'
import { lineRoute } from './serviceLines'


// Export ServiceResponse as ServiceItem for backward compatibility
export type ServiceItem = ServiceResponse

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

export interface StartAttendanceOptions {
    /** Localização capturada pelo app no momento do "Estou aqui" (best-effort). */
    location?: { latitude?: number; longitude?: number; accuracy?: number }
    /** Código de retirada informado pelo cliente ao motorista (quando exigido). */
    pickupCode?: string
    /** Código do motivo (catálogo) — usado quando o código é dispensado/bypass. */
    reasonCode?: string
    /** Texto livre do motivo — usado junto com reasonCode quando aplicável. */
    reasonText?: string
}

async function startAttendance(
    id: Id,
    opts?: StartAttendanceOptions,
): Promise<BaseResponse<ServiceResponse>> {
    const body = {
        ...(opts?.location ?? {}),
        ...(opts?.pickupCode ? { pickupCode: opts.pickupCode } : {}),
        ...(opts?.reasonCode ? { reasonCode: opts.reasonCode } : {}),
        ...(opts?.reasonText ? { reasonText: opts.reasonText } : {}),
    }
    const { data } = await apiAgility.patch<BaseResponse<ServiceResponse>>(`/services/${id}/start-attendance`, body)
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
): Promise<BaseResponse<ServiceResponse & { occurrenceOutcome: OccurrenceOutcome; awaitingReturn?: boolean }>> {
    // Remover campos undefined do payload
    const cleanPayload = Object.entries(payload).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null) {
            acc[key] = value;
        }
        return acc;
    }, {} as Record<string, any>);

    const { data } = await apiAgility.post<BaseResponse<ServiceResponse & { occurrenceOutcome: OccurrenceOutcome; awaitingReturn?: boolean }>>(
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

/** Tentativas de entrega do pedido, em ordem (falhas, devolução e desfecho). */
async function findAttempts(id: Id): Promise<BaseResponse<DeliveryAttemptResponse[]>> {
    const { data } = await apiAgility.get<BaseResponse<DeliveryAttemptResponse[]>>(`/services/${id}/attempts`)
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
// LINHAS (itens do pedido e materiais do SERVICE), fase 3C
// ============================================

/** As linhas pela rota da família: o pedido em `/items`, o SERVICE em `/materials` (`lineRoute`). */
async function getLines(serviceId: Id, serviceType: ServiceType | null | undefined): Promise<BaseResponse<ServiceLine[]>> {
    const { data } = await apiAgility.get<BaseResponse<ServiceLine[]>>(
        `/services/${serviceId}/${lineRoute(serviceType)}`
    )
    return data
}

async function checkLine(
    serviceId: Id,
    serviceType: ServiceType | null | undefined,
    lineId: Id,
    payload: MaterialCheckRequest
): Promise<BaseResponse<MaterialCheckResponse>> {
    const { data } = await apiAgility.patch<BaseResponse<MaterialCheckResponse>>(
        `/services/${serviceId}/${lineRoute(serviceType)}/${lineId}/check`,
        payload
    )
    return data
}

// ============================================
// TROCA DE EQUIPAMENTO NA PARADA (fase 3D)
// Sempre em /materials: só SERVICE troca.
// ============================================

/** O código no cadastro do dono do pedido. O axios codifica o código na query. */
async function lookupEquipment(serviceId: Id, code: string): Promise<BaseResponse<EquipmentLookupResponse>> {
    const { data } = await apiAgility.get<BaseResponse<EquipmentLookupResponse>>(
        `/services/${serviceId}/materials/equipment-lookup`,
        { params: { code } }
    )
    return data
}

async function swapLine(serviceId: Id, lineId: Id, payload: SwapLineRequest): Promise<BaseResponse<SwapLineResponse>> {
    const { data } = await apiAgility.post<BaseResponse<SwapLineResponse>>(
        `/services/${serviceId}/materials/${lineId}/swap`,
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
    findAll,
    findByRoutingId,
    findPending,
    findOne,
    assignDriver,
    unassignDriver,
    start,
    startAttendance,
    completeWithDetails,
    fail,
    applyOccurrence,
    findAttempts,
    remove,
    removeBatch,
    // Linhas (fase 3C)
    getLines,
    checkLine,
    // Troca de equipamento (fase 3D)
    lookupEquipment,
    swapLine,
    // Draft
    saveDraft,
    getDraft,
    clearDraft,
}

