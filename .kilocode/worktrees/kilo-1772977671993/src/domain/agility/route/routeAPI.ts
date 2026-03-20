import { apiAgility } from '@/api/apiConfig'
import type { BaseResponse } from '@/api/baseResponse'
import type { Id } from '@/types/base'

type ListRoutesParams = { page?: number; limit?: number; driverId?: Id; vehicleId?: Id; routingId?: Id }

/**
 * Route item type matching backend RouteEntity.toJson()
 */
export type RouteItem = {
    id: Id
    routingId: string
    originServiceId: string
    destinationServiceId: string
    sequenceOrder: number
    distanceKm?: number
    durationMinutes?: number
    geometry?: string // polyline encoded - ready for map display
    waypoints?: any[]
    status: 'PENDING' | 'CALCULATED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
    calculatedAt?: string
    isPending?: boolean
    isCalculated?: boolean
    isInProgress?: boolean
    isCompleted?: boolean
    isFailed?: boolean
    hasCalculatedRoute?: boolean
    hasGeometry?: boolean
    createdAt?: string
    updatedAt?: string
} & Record<string, unknown>

async function createBroadcast(payload: Record<string, unknown>): Promise<BaseResponse<{ route: RouteItem; offersCreated: number; offers: Record<string, unknown>[] }>> {
    const { data } = await apiAgility.post<BaseResponse<{ route: RouteItem; offersCreated: number; offers: Record<string, unknown>[] }>>('/routes/broadcast', payload)
    return data
}

async function createDirect(payload: Record<string, unknown>): Promise<BaseResponse<RouteItem>> {
    const { data } = await apiAgility.post<BaseResponse<RouteItem>>('/routes/direct', payload)
    return data
}

async function findAll(params: ListRoutesParams = {}): Promise<BaseResponse<RouteItem[]>> {
    const qs = new URLSearchParams()
    if (params.driverId) qs.append('driverId', params.driverId)
    if (params.vehicleId) qs.append('vehicleId', params.vehicleId)
    if (params.routingId) qs.append('routingId', params.routingId)
    if (params.page) qs.append('page', String(params.page))
    if (params.limit) qs.append('limit', String(params.limit))
    const suffix = qs.toString() ? `?${qs.toString()}` : ''
    const { data } = await apiAgility.get<BaseResponse<RouteItem[]>>(`/routes${suffix}`)
    return data
}

async function findByRoutingId(routingId: Id): Promise<BaseResponse<RouteItem[]>> {
    const { data } = await apiAgility.get<BaseResponse<RouteItem[]>>(`/routes?routingId=${routingId}`)
    return data
}

async function findPending(): Promise<BaseResponse<RouteItem[]>> {
    const { data } = await apiAgility.get<BaseResponse<RouteItem[]>>('/routes/pending')
    return data
}

async function findAvailableForDriver(driverId: Id): Promise<BaseResponse<RouteItem[]>> {
    const { data } = await apiAgility.get<BaseResponse<RouteItem[]>>(`/routes/available/${driverId}`)
    return data
}

async function findOne(id: Id): Promise<BaseResponse<RouteItem>> {
    const { data } = await apiAgility.get<BaseResponse<RouteItem>>(`/routes/${id}`)
    return data
}

async function findByCode(routeCode: string): Promise<BaseResponse<RouteItem>> {
    const { data } = await apiAgility.get<BaseResponse<RouteItem>>(`/routes/code/${routeCode}`)
    return data
}

async function update(id: Id, payload: Record<string, unknown>): Promise<BaseResponse<RouteItem>> {
    const { data } = await apiAgility.patch<BaseResponse<RouteItem>>(`/routes/${id}`, payload)
    return data
}

async function accept(id: Id, driverId: Id): Promise<BaseResponse<RouteItem>> {
    const { data } = await apiAgility.post<BaseResponse<RouteItem>>(`/routes/${id}/accept`, { driverId })
    return data
}

async function reject(id: Id, driverId: Id, reason?: string): Promise<BaseResponse<{ message: string }>> {
    const { data } = await apiAgility.post<BaseResponse<{ message: string }>>(`/routes/${id}/reject`, { driverId, reason })
    return data
}

async function assignDriver(id: Id, driverId: Id): Promise<BaseResponse<RouteItem>> {
    const { data } = await apiAgility.post<BaseResponse<RouteItem>>(`/routes/${id}/assign`, { driverId })
    return data
}

async function start(id: Id): Promise<BaseResponse<RouteItem>> {
    const { data } = await apiAgility.patch<BaseResponse<RouteItem>>(`/routes/${id}/start`)
    return data
}

async function complete(id: Id): Promise<BaseResponse<RouteItem>> {
    const { data } = await apiAgility.patch<BaseResponse<RouteItem>>(`/routes/${id}/complete`)
    return data
}

async function cancel(id: Id): Promise<BaseResponse<RouteItem>> {
    const { data } = await apiAgility.patch<BaseResponse<RouteItem>>(`/routes/${id}/cancel`)
    return data
}

async function changeStatus(id: Id, status: string): Promise<BaseResponse<RouteItem>> {
    const { data } = await apiAgility.put<BaseResponse<RouteItem>>(`/routes/${id}/status`, { status })
    return data
}

async function remove(id: Id): Promise<BaseResponse<void>> {
    const { data } = await apiAgility.delete<BaseResponse<void>>(`/routes/${id}`)
    return data
}

async function calculateRoute(id: Id, profile?: string): Promise<BaseResponse<RouteItem>> {
    const suffix = profile ? `?profile=${profile}` : ''
    const { data } = await apiAgility.patch<BaseResponse<RouteItem>>(`/routes/${id}/calculate${suffix}`)
    return data
}

export const routeAPI = {
    createBroadcast,
    createDirect,
    findAll,
    findPending,
    findAvailableForDriver,
    findOne,
    findByCode,
    findByRoutingId,
    update,
    accept,
    reject,
    assignDriver,
    start,
    complete,
    cancel,
    changeStatus,
    calculateRoute,
    remove,
}