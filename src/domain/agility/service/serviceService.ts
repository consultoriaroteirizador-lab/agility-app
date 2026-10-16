import { BaseResponse } from '@/api'
import type { Id } from '@/types/base'

import type {
    ListServicesRequest,
    ServiceResponse,
    ServiceCompletionDetailsRequest,
    ServiceFailRequest,
    ServiceDraftData,
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
import { serviceAPI, type ServiceItem, type StartAttendanceOptions } from './serviceAPI'

async function findAll(params: ListServicesRequest = {}): Promise<BaseResponse<ServiceResponse[]>> {
    return serviceAPI.findAll(params)
}

async function findByRoutingId(routingId: string): Promise<BaseResponse<ServiceResponse[]>> {
    return serviceAPI.findByRoutingId(routingId)
}

async function findPending(): Promise<BaseResponse<ServiceResponse[]>> {
    return serviceAPI.findPending()
}

async function findOne(id: Id): Promise<BaseResponse<ServiceResponse>> {
    return serviceAPI.findOne(id)
}

async function assignDriver(id: Id, driverId: Id): Promise<BaseResponse<ServiceResponse>> {
    return serviceAPI.assignDriver(id, driverId)
}

async function unassignDriver(id: Id): Promise<BaseResponse<ServiceResponse>> {
    return serviceAPI.unassignDriver(id)
}

async function start(id: Id): Promise<BaseResponse<ServiceResponse>> {
    return serviceAPI.start(id)
}

async function startAttendance(
    id: Id,
    opts?: StartAttendanceOptions,
): Promise<BaseResponse<ServiceResponse>> {
    return serviceAPI.startAttendance(id, opts)
}

async function completeWithDetails(
    id: Id,
    details: ServiceCompletionDetailsRequest,
): Promise<BaseResponse<ServiceResponse>> {
    return serviceAPI.completeWithDetails(id, details)
}

async function fail(
    id: Id,
    payload: ServiceFailRequest,
): Promise<BaseResponse<ServiceResponse>> {
    return serviceAPI.fail(id, payload)
}

async function applyOccurrence(
    id: Id,
    payload: ApplyOccurrenceRequest,
): Promise<BaseResponse<ServiceResponse & { occurrenceOutcome: OccurrenceOutcome; awaitingReturn?: boolean }>> {
    return serviceAPI.applyOccurrence(id, payload)
}

async function findAttempts(id: Id): Promise<BaseResponse<DeliveryAttemptResponse[]>> {
    return serviceAPI.findAttempts(id)
}

async function remove(id: Id): Promise<BaseResponse<{ success: boolean; message: string }>> {
    return serviceAPI.remove(id)
}

interface BatchDeleteResult {
    deletedCount: number
    deletedIds: string[]
    failedIds: { id: string; error: string }[]
}

async function removeBatch(ids: string[]): Promise<BaseResponse<BatchDeleteResult>> {
    return serviceAPI.removeBatch(ids)
}

// Linhas (fase 3C)
async function getLines(serviceId: Id, serviceType: ServiceType | null | undefined): Promise<BaseResponse<ServiceLine[]>> {
    return serviceAPI.getLines(serviceId, serviceType)
}

async function checkLine(
    serviceId: Id,
    serviceType: ServiceType | null | undefined,
    lineId: Id,
    payload: MaterialCheckRequest
): Promise<BaseResponse<MaterialCheckResponse>> {
    return serviceAPI.checkLine(serviceId, serviceType, lineId, payload)
}

// Troca de equipamento (fase 3D)
async function lookupEquipment(serviceId: Id, code: string): Promise<BaseResponse<EquipmentLookupResponse>> {
    return serviceAPI.lookupEquipment(serviceId, code)
}

async function swapLine(serviceId: Id, lineId: Id, payload: SwapLineRequest): Promise<BaseResponse<SwapLineResponse>> {
    return serviceAPI.swapLine(serviceId, lineId, payload)
}

async function saveDraft(
    id: Id,
    draft: ServiceDraftData,
): Promise<BaseResponse<SaveServiceDraftResponse>> {
    return serviceAPI.saveDraft(id, draft)
}

async function getDraft(id: Id): Promise<BaseResponse<GetServiceDraftResponse>> {
    return serviceAPI.getDraft(id)
}

async function clearDraft(id: Id): Promise<void> {
    return serviceAPI.clearDraft(id)
}

export type { ServiceItem, BatchDeleteResult }
export const serviceService = {
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
