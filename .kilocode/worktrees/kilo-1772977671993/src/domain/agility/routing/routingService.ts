import { BaseResponse } from '@/api'
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
import { routingAPI } from './routingAPI'

async function create(payload: CreateRoutingRequest): Promise<BaseResponse<RoutingResponse>> {
    return routingAPI.create(payload)
}

async function findAll(params: ListRoutingsRequest = {}): Promise<BaseResponse<RoutingResponse[] | RoutingsAggregatedSummaryResponse>> {
    return routingAPI.findAll(params)
}

async function findPending(): Promise<BaseResponse<RoutingResponse[]>> {
    return routingAPI.findPending()
}

async function findBroadcasting(params?: BroadcastingQueryRequest): Promise<BaseResponse<RoutingResponse[]>> {
    return routingAPI.findBroadcasting(params)
}

async function findInProgress(): Promise<BaseResponse<RoutingResponse[]>> {
    return routingAPI.findInProgress()
}

async function findMyRoutings(params: ListRoutingsRequest = {}): Promise<BaseResponse<RoutingResponse[]>> {
    return routingAPI.findMyRoutings(params)
}

async function count(status?: string): Promise<BaseResponse<RoutingCountResponse>> {
    return routingAPI.count(status)
}

async function findById(id: Id): Promise<BaseResponse<RoutingResponse>> {
    return routingAPI.findById(id)
}

async function update(
    id: Id,
    payload: UpdateRoutingRequest,
): Promise<BaseResponse<RoutingResponse>> {
    return routingAPI.update(id, payload)
}

async function publish(id: Id): Promise<BaseResponse<RoutingResponse>> {
    return routingAPI.publish(id)
}

async function assignDriver(id: Id, driverId: Id): Promise<BaseResponse<RoutingResponse>> {
    return routingAPI.assignDriver(id, driverId)
}

async function unassignDriver(id: Id): Promise<BaseResponse<RoutingResponse>> {
    return routingAPI.unassignDriver(id)
}

async function assignVehicle(id: Id, vehicleId: Id): Promise<BaseResponse<RoutingResponse>> {
    return routingAPI.assignVehicle(id, vehicleId)
}

async function start(id: Id): Promise<BaseResponse<RoutingResponse>> {
    return routingAPI.start(id)
}

async function complete(id: Id): Promise<BaseResponse<RoutingResponse>> {
    return routingAPI.complete(id)
}

async function cancel(id: Id): Promise<BaseResponse<RoutingResponse>> {
    return routingAPI.cancel(id)
}

async function remove(id: Id): Promise<BaseResponse<RoutingResponse>> {
    return routingAPI.remove(id)
}

async function addServices(
    id: Id,
    payload: AddServicesToRoutingRequest,
): Promise<BaseResponse<AddServicesToRoutingResponse>> {
    return routingAPI.addServices(id, payload)
}

async function getSummary(id: Id): Promise<BaseResponse<RoutingSummaryResponse>> {
    return routingAPI.getSummary(id)
}

async function getMapData(id: Id): Promise<BaseResponse<RoutingMapDataResponse>> {
    return routingAPI.getMapData(id)
}

async function acceptRouting(id: Id, payload?: AcceptRoutingRequest): Promise<BaseResponse<RoutingResponse>> {
    return routingAPI.acceptRouting(id, payload)
}

export const routingService = {
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
}


