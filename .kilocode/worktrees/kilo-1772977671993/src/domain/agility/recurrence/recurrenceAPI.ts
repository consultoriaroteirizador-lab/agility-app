import { BaseResponse } from '@/api';
import { apiService } from '@/api/apiConfig';
import type { Id } from '@/types/base';

import type {
    CreateRouteRecurrenceRequest,
    UpdateRouteRecurrenceRequest,
    RouteRecurrenceResponse,
    CreateDriverRecurrenceRequest,
    UpdateDriverRecurrenceRequest,
    DriverRecurrenceResponse,
    CreateServiceTypeRecurrenceRequest,
    UpdateServiceTypeRecurrenceRequest,
    ServiceTypeRecurrenceResponse,
} from './dto';


// Route Recurrences
async function createRouteRecurrence(payload: CreateRouteRecurrenceRequest): Promise<BaseResponse<RouteRecurrenceResponse>> {
    const { data } = await apiService.post<BaseResponse<RouteRecurrenceResponse>>('/recurrences/routes', payload);
    return data;
}

async function findAllRouteRecurrences(): Promise<BaseResponse<RouteRecurrenceResponse[]>> {
    const { data } = await apiService.get<BaseResponse<RouteRecurrenceResponse[]>>('/recurrences/routes');
    return data;
}

async function findRouteRecurrenceById(id: Id): Promise<BaseResponse<RouteRecurrenceResponse>> {
    const { data } = await apiService.get<BaseResponse<RouteRecurrenceResponse>>(`/recurrences/routes/${id}`);
    return data;
}

async function findRouteRecurrencesByDriverId(driverId: Id): Promise<BaseResponse<RouteRecurrenceResponse[]>> {
    const { data } = await apiService.get<BaseResponse<RouteRecurrenceResponse[]>>(`/recurrences/routes/driver/${driverId}`);
    return data;
}

async function updateRouteRecurrence(
    id: Id,
    payload: UpdateRouteRecurrenceRequest,
): Promise<BaseResponse<RouteRecurrenceResponse>> {
    const { data } = await apiService.patch<BaseResponse<RouteRecurrenceResponse>>(`/recurrences/routes/${id}`, payload);
    return data;
}

async function incrementRouteRecurrenceUsage(id: Id): Promise<BaseResponse<RouteRecurrenceResponse>> {
    const { data } = await apiService.patch<BaseResponse<RouteRecurrenceResponse>>(`/recurrences/routes/${id}/increment-usage`);
    return data;
}

async function deleteRouteRecurrence(id: Id): Promise<BaseResponse<RouteRecurrenceResponse>> {
    const { data } = await apiService.delete<BaseResponse<RouteRecurrenceResponse>>(`/recurrences/routes/${id}`);
    return data;
}

// Driver Recurrences
async function createDriverRecurrence(payload: CreateDriverRecurrenceRequest): Promise<BaseResponse<DriverRecurrenceResponse>> {
    const { data } = await apiService.post<BaseResponse<DriverRecurrenceResponse>>('/recurrences/drivers', payload);
    return data;
}

async function findAllDriverRecurrences(): Promise<BaseResponse<DriverRecurrenceResponse[]>> {
    const { data } = await apiService.get<BaseResponse<DriverRecurrenceResponse[]>>('/recurrences/drivers');
    return data;
}

async function findDriverRecurrenceById(id: Id): Promise<BaseResponse<DriverRecurrenceResponse>> {
    const { data } = await apiService.get<BaseResponse<DriverRecurrenceResponse>>(`/recurrences/drivers/${id}`);
    return data;
}

async function findDriverRecurrenceByDriverId(driverId: Id): Promise<BaseResponse<DriverRecurrenceResponse | null>> {
    const { data } = await apiService.get<BaseResponse<DriverRecurrenceResponse | null>>(`/recurrences/drivers/driver/${driverId}`);
    return data;
}

async function updateDriverRecurrence(
    id: Id,
    payload: UpdateDriverRecurrenceRequest,
): Promise<BaseResponse<DriverRecurrenceResponse>> {
    const { data } = await apiService.patch<BaseResponse<DriverRecurrenceResponse>>(`/recurrences/drivers/${id}`, payload);
    return data;
}

async function incrementDriverRecurrenceUsage(id: Id): Promise<BaseResponse<DriverRecurrenceResponse>> {
    const { data } = await apiService.patch<BaseResponse<DriverRecurrenceResponse>>(`/recurrences/drivers/${id}/increment-usage`);
    return data;
}

async function deleteDriverRecurrence(id: Id): Promise<BaseResponse<DriverRecurrenceResponse>> {
    const { data } = await apiService.delete<BaseResponse<DriverRecurrenceResponse>>(`/recurrences/drivers/${id}`);
    return data;
}

// Service Type Recurrences
async function createServiceTypeRecurrence(payload: CreateServiceTypeRecurrenceRequest): Promise<BaseResponse<ServiceTypeRecurrenceResponse>> {
    const { data } = await apiService.post<BaseResponse<ServiceTypeRecurrenceResponse>>('/recurrences/service-types', payload);
    return data;
}

async function findAllServiceTypeRecurrences(): Promise<BaseResponse<ServiceTypeRecurrenceResponse[]>> {
    const { data } = await apiService.get<BaseResponse<ServiceTypeRecurrenceResponse[]>>('/recurrences/service-types');
    return data;
}

async function findServiceTypeRecurrenceById(id: Id): Promise<BaseResponse<ServiceTypeRecurrenceResponse>> {
    const { data } = await apiService.get<BaseResponse<ServiceTypeRecurrenceResponse>>(`/recurrences/service-types/${id}`);
    return data;
}

async function findServiceTypeRecurrenceByName(name: string): Promise<BaseResponse<ServiceTypeRecurrenceResponse | null>> {
    const { data } = await apiService.get<BaseResponse<ServiceTypeRecurrenceResponse | null>>(`/recurrences/service-types/name/${encodeURIComponent(name)}`);
    return data;
}

async function updateServiceTypeRecurrence(
    id: Id,
    payload: UpdateServiceTypeRecurrenceRequest,
): Promise<BaseResponse<ServiceTypeRecurrenceResponse>> {
    const { data } = await apiService.patch<BaseResponse<ServiceTypeRecurrenceResponse>>(`/recurrences/service-types/${id}`, payload);
    return data;
}

async function incrementServiceTypeRecurrenceUsage(id: Id): Promise<BaseResponse<ServiceTypeRecurrenceResponse>> {
    const { data } = await apiService.patch<BaseResponse<ServiceTypeRecurrenceResponse>>(`/recurrences/service-types/${id}/increment-usage`);
    return data;
}

async function deleteServiceTypeRecurrence(id: Id): Promise<BaseResponse<ServiceTypeRecurrenceResponse>> {
    const { data } = await apiService.delete<BaseResponse<ServiceTypeRecurrenceResponse>>(`/recurrences/service-types/${id}`);
    return data;
}

export const recurrenceAPI = {
    // Route Recurrences
    createRouteRecurrence,
    findAllRouteRecurrences,
    findRouteRecurrenceById,
    findRouteRecurrencesByDriverId,
    updateRouteRecurrence,
    incrementRouteRecurrenceUsage,
    deleteRouteRecurrence,
    
    // Driver Recurrences
    createDriverRecurrence,
    findAllDriverRecurrences,
    findDriverRecurrenceById,
    findDriverRecurrenceByDriverId,
    updateDriverRecurrence,
    incrementDriverRecurrenceUsage,
    deleteDriverRecurrence,
    
    // Service Type Recurrences
    createServiceTypeRecurrence,
    findAllServiceTypeRecurrences,
    findServiceTypeRecurrenceById,
    findServiceTypeRecurrenceByName,
    updateServiceTypeRecurrence,
    incrementServiceTypeRecurrenceUsage,
    deleteServiceTypeRecurrence,
};

