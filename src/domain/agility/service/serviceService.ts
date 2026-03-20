import { BaseResponse } from '@/api'
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
} from './dto'
import type {
    ServiceMaterialResponse,
    MaterialCheckRequest,
    MaterialCheckResponse,
} from './dto/response/service-material.response'
import { serviceAPI, type ServiceItem } from './serviceAPI'

/**
 * Cria um service
 * TODO: Validação de coordenadas de endereço pode ser adicionada quando necessário
 */
async function create(payload: CreateServiceRequest): Promise<BaseResponse<ServiceResponse>> {
    return serviceAPI.create(payload)
}

/**
 * Cria múltiplos services em batch
 * TODO: Validação de coordenadas de endereço pode ser adicionada quando necessário
 */
async function createBatch(payload: CreateServicesBatchRequest): Promise<BaseResponse<BatchCreationResult>> {
    return serviceAPI.createBatch(payload)
}

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

async function update(
    id: Id,
    payload: UpdateServiceRequest,
): Promise<BaseResponse<ServiceResponse>> {
    return serviceAPI.update(id, payload)
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

async function complete(id: Id, completionNotes?: string): Promise<BaseResponse<ServiceResponse>> {
    return serviceAPI.complete(id, completionNotes)
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

async function changeStatus(
    id: Id,
    payload: ChangeServiceStatusRequest,
): Promise<BaseResponse<ServiceResponse>> {
    return serviceAPI.changeStatus(id, payload)
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

// Materials
async function getMaterials(serviceId: Id): Promise<BaseResponse<ServiceMaterialResponse[]>> {
    return serviceAPI.getMaterials(serviceId)
}

async function checkMaterial(
    serviceId: Id,
    materialId: Id,
    payload: MaterialCheckRequest
): Promise<BaseResponse<MaterialCheckResponse>> {
    return serviceAPI.checkMaterial(serviceId, materialId, payload)
}

export type { ServiceItem, BatchDeleteResult }
export const serviceService = {
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
    complete,
    completeWithDetails,
    fail,
    changeStatus,
    remove,
    removeBatch,
    // Materials
    getMaterials,
    checkMaterial,
}
