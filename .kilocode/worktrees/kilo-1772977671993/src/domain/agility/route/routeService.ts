import type { BaseResponse } from '@/api/baseResponse'
import type { Id, PaginationQuery } from '@/types/base'

import { routeAPI, type RouteItem } from './routeAPI'

type ListRoutesParams = PaginationQuery & { driverId?: Id; vehicleId?: Id; routingId?: Id }

async function createBroadcast(payload: Record<string, unknown>): Promise<BaseResponse<{ route: RouteItem; offersCreated: number; offers: Record<string, unknown>[] }>> {
    return routeAPI.createBroadcast(payload)
}

async function createDirect(payload: Record<string, unknown>): Promise<BaseResponse<RouteItem>> {
    return routeAPI.createDirect(payload)
}

async function findAll(params: ListRoutesParams = {}): Promise<BaseResponse<RouteItem[]>> {
    return routeAPI.findAll(params)
}

async function findPending(): Promise<BaseResponse<RouteItem[]>> {
    return routeAPI.findPending()
}

async function findAvailableForDriver(driverId: Id): Promise<BaseResponse<RouteItem[]>> {
    return routeAPI.findAvailableForDriver(driverId)
}

async function findOne(id: Id): Promise<BaseResponse<RouteItem>> {
    return routeAPI.findOne(id)
}

async function findByCode(routeCode: string): Promise<BaseResponse<RouteItem>> {
    return routeAPI.findByCode(routeCode)
}

async function findByRoutingId(routingId: Id): Promise<BaseResponse<RouteItem[]>> {
    return routeAPI.findByRoutingId(routingId)
}

async function update(id: Id, payload: Record<string, unknown>): Promise<BaseResponse<RouteItem>> {
    return routeAPI.update(id, payload)
}

async function accept(id: Id, driverId: Id): Promise<BaseResponse<RouteItem>> {
    return routeAPI.accept(id, driverId)
}

async function reject(id: Id, driverId: Id, reason?: string): Promise<BaseResponse<{ message: string }>> {
    return routeAPI.reject(id, driverId, reason)
}

async function assignDriver(id: Id, driverId: Id): Promise<BaseResponse<RouteItem>> {
    return routeAPI.assignDriver(id, driverId)
}

async function start(id: Id): Promise<BaseResponse<RouteItem>> {
    return routeAPI.start(id)
}

async function complete(id: Id): Promise<BaseResponse<RouteItem>> {
    return routeAPI.complete(id)
}

async function cancel(id: Id): Promise<BaseResponse<RouteItem>> {
    return routeAPI.cancel(id)
}

async function changeStatus(id: Id, status: string): Promise<BaseResponse<RouteItem>> {
    return routeAPI.changeStatus(id, status)
}

async function remove(id: Id): Promise<BaseResponse<void>> {
    return routeAPI.remove(id)
}

async function calculateRoute(id: Id, profile?: string): Promise<BaseResponse<RouteItem>> {
    return routeAPI.calculateRoute(id, profile)
}

export type { RouteItem }
export const routeService = {
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

