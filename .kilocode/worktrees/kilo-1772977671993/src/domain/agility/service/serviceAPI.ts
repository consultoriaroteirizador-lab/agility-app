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
} from './dto'


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
            ...(params.orderId && { orderId: params.orderId }),
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
    complete,
    completeWithDetails,
    fail,
    changeStatus,
    remove,
    removeBatch,
}

