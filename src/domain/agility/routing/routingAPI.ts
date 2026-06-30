import { BaseResponse } from '@/api'
import { apiAgility } from '@/api/apiConfig'
import type { Id } from '@/types/base'

import type {
    CreateRoutingRequest,
    UpdateRoutingRequest,
    ListRoutingsRequest,
    RoutingResponse,
    RoutingCountResponse,
    AddServicesToRoutingRequest,
    AddServicesToRoutingResponse,
    RoutingSummaryResponse,
    RoutingMapDataResponse,
    BroadcastingQueryRequest,
    AcceptRoutingRequest,
    RoutingsAggregatedSummaryResponse,
} from './dto'


async function create(payload: CreateRoutingRequest): Promise<BaseResponse<RoutingResponse>> {
    const { data } = await apiAgility.post<BaseResponse<RoutingResponse>>('/routings', payload)
    return data
}

async function findAll(params: ListRoutingsRequest = {}): Promise<BaseResponse<RoutingResponse[]>> {
    const { data } = await apiAgility.get<BaseResponse<RoutingResponse[]>>('/routings', {
        params: {
            ...(params.status && { status: params.status }),
            ...(params.driverId && { driverId: params.driverId }),
            ...(params.date && { date: params.date }),
        },
    })
    return data
}

async function getAggregatedSummary(status?: string): Promise<BaseResponse<RoutingsAggregatedSummaryResponse>> {
    const { data } = await apiAgility.get<BaseResponse<RoutingsAggregatedSummaryResponse>>('/routings/summary', {
        params: status ? { status } : {},
    })
    return data
}

async function findPending(): Promise<BaseResponse<RoutingResponse[]>> {
    const { data } = await apiAgility.get<BaseResponse<RoutingResponse[]>>('/routings/pending')
    return data
}

async function findBroadcasting(params?: BroadcastingQueryRequest): Promise<BaseResponse<RoutingResponse[]>> {
    const { data } = await apiAgility.get<BaseResponse<RoutingResponse[]>>('/routings/broadcasting', {
        params: {
            ...(params?.driverLatitude !== undefined && { driverLatitude: params.driverLatitude }),
            ...(params?.driverLongitude !== undefined && { driverLongitude: params.driverLongitude }),
        },
    })
    return data
}

async function findInProgress(): Promise<BaseResponse<RoutingResponse[]>> {
    const { data } = await apiAgility.get<BaseResponse<RoutingResponse[]>>('/routings/in-progress')
    return data
}

async function findMyRoutings(params: ListRoutingsRequest = {}): Promise<BaseResponse<RoutingResponse[]>> {
    if (__DEV__) {
        console.log('[routingAPI.findMyRoutings] Chamando API com params:', params);
    }
    const { data } = await apiAgility.get<BaseResponse<RoutingResponse[]>>('/routings/my-routings', {
        params: {
            ...(params.status && { status: params.status }),
        },
    });
    if (__DEV__) {
        console.log('[routingAPI.findMyRoutings] Resposta:', data?.success, 'Result é array?', Array.isArray(data?.result));
    }
    return data;
}

async function count(status?: string): Promise<BaseResponse<RoutingCountResponse>> {
    const { data } = await apiAgility.get<BaseResponse<RoutingCountResponse>>('/routings/count', {
        params: status ? { status } : {},
    })
    return data
}

async function findById(id: Id): Promise<BaseResponse<RoutingResponse>> {
    const { data } = await apiAgility.get<BaseResponse<RoutingResponse>>(`/routings/${id}`)
    return data
}

async function update(
    id: Id,
    payload: UpdateRoutingRequest,
): Promise<BaseResponse<RoutingResponse>> {
    // Backend expõe @Put(':id') para atualização (não PATCH).
    const { data } = await apiAgility.put<BaseResponse<RoutingResponse>>(`/routings/${id}`, payload)
    return data
}

async function publish(id: Id): Promise<BaseResponse<RoutingResponse>> {
    const { data } = await apiAgility.patch<BaseResponse<RoutingResponse>>(`/routings/${id}/publish`)
    return data
}

async function assignDriver(id: Id, driverId: Id): Promise<BaseResponse<RoutingResponse>> {
    const { data } = await apiAgility.patch<BaseResponse<RoutingResponse>>(`/routings/${id}/assign-driver/${driverId}`)
    return data
}

async function unassignDriver(id: Id): Promise<BaseResponse<RoutingResponse>> {
    const { data } = await apiAgility.patch<BaseResponse<RoutingResponse>>(`/routings/${id}/unassign-driver`)
    return data
}

async function assignVehicle(id: Id, vehicleId: Id): Promise<BaseResponse<RoutingResponse>> {
    const { data } = await apiAgility.patch<BaseResponse<RoutingResponse>>(`/routings/${id}/assign-vehicle/${vehicleId}`)
    return data
}

async function start(id: Id): Promise<BaseResponse<RoutingResponse>> {
    const { data } = await apiAgility.patch<BaseResponse<RoutingResponse>>(`/routings/${id}/start`)
    return data
}

async function complete(id: Id): Promise<BaseResponse<RoutingResponse>> {
    const { data } = await apiAgility.patch<BaseResponse<RoutingResponse>>(`/routings/${id}/complete`)
    return data
}

async function cancel(id: Id): Promise<BaseResponse<RoutingResponse>> {
    const { data } = await apiAgility.patch<BaseResponse<RoutingResponse>>(`/routings/${id}/cancel`)
    return data
}

async function remove(id: Id): Promise<BaseResponse<RoutingResponse>> {
    const { data } = await apiAgility.delete<BaseResponse<RoutingResponse>>(`/routings/${id}`)
    return data
}

async function addServices(
    id: Id,
    payload: AddServicesToRoutingRequest,
): Promise<BaseResponse<AddServicesToRoutingResponse>> {
    const { data } = await apiAgility.post<BaseResponse<AddServicesToRoutingResponse>>(
        `/routings/${id}/services`,
        payload,
    )
    return data
}

async function getSummary(id: Id): Promise<BaseResponse<RoutingSummaryResponse>> {
    const { data } = await apiAgility.get<BaseResponse<RoutingSummaryResponse>>(`/routings/${id}/summary`)
    return data
}

async function getMapData(id: Id): Promise<BaseResponse<RoutingMapDataResponse>> {
    const { data } = await apiAgility.get<BaseResponse<RoutingMapDataResponse>>(`/routings/${id}/map-data`)
    return data
}

async function acceptRouting(id: Id, payload?: AcceptRoutingRequest): Promise<BaseResponse<RoutingResponse>> {
    const { data } = await apiAgility.post<BaseResponse<RoutingResponse>>(`/routings/${id}/accept`, payload || {})
    return data
}

export interface ReturnManifestItem {
    material: string
    sku: string | null
    unit: string | null
    quantity: number
    origin: 'PICKUP' | 'UNDELIVERED'
    serviceId: string
    serviceCode: string | null
}

export interface ReturnManifestResponse {
    routingId: string
    items: ReturnManifestItem[]
}

async function getReturnManifest(id: Id): Promise<BaseResponse<ReturnManifestResponse>> {
    const { data } = await apiAgility.get<BaseResponse<ReturnManifestResponse>>(`/routings/${id}/return-manifest`)
    return data
}

export const routingAPI = {
    create,
    findAll,
    findPending,
    findBroadcasting,
    findInProgress,
    findMyRoutings,
    count,
    findById,
    update,
    publish,
    assignDriver,
    unassignDriver,
    assignVehicle,
    start,
    complete,
    cancel,
    remove,
    addServices,
    getSummary,
    getMapData,
    acceptRouting,
    getAggregatedSummary,
    getReturnManifest,
}


