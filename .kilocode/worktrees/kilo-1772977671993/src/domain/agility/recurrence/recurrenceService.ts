import type { Id } from '@/types/base';

import type {
    RouteRecurrenceResponse,
    DriverRecurrenceResponse,
    ServiceTypeRecurrenceResponse,
    CreateRouteRecurrenceRequest,
    UpdateRouteRecurrenceRequest,
    CreateDriverRecurrenceRequest,
    UpdateDriverRecurrenceRequest,
    CreateServiceTypeRecurrenceRequest,
    UpdateServiceTypeRecurrenceRequest,
} from './dto';
import { recurrenceAPI } from './recurrenceAPI';

export const recurrenceService = {
    // Route Recurrences
    createRouteRecurrence: async (payload: CreateRouteRecurrenceRequest): Promise<RouteRecurrenceResponse> => {
        const response = await recurrenceAPI.createRouteRecurrence(payload);
        return response.result!;
    },

    findAllRouteRecurrences: async (): Promise<RouteRecurrenceResponse[]> => {
        const response = await recurrenceAPI.findAllRouteRecurrences();
        return response.result || [];
    },

    findRouteRecurrenceById: async (id: Id): Promise<RouteRecurrenceResponse> => {
        const response = await recurrenceAPI.findRouteRecurrenceById(id);
        return response.result!;
    },

    findRouteRecurrencesByDriverId: async (driverId: Id): Promise<RouteRecurrenceResponse[]> => {
        const response = await recurrenceAPI.findRouteRecurrencesByDriverId(driverId);
        return response.result || [];
    },

    updateRouteRecurrence: async (id: Id, payload: UpdateRouteRecurrenceRequest): Promise<RouteRecurrenceResponse> => {
        const response = await recurrenceAPI.updateRouteRecurrence(id, payload);
        return response.result!;
    },

    incrementRouteRecurrenceUsage: async (id: Id): Promise<RouteRecurrenceResponse> => {
        const response = await recurrenceAPI.incrementRouteRecurrenceUsage(id);
        return response.result!;
    },

    deleteRouteRecurrence: async (id: Id): Promise<RouteRecurrenceResponse> => {
        const response = await recurrenceAPI.deleteRouteRecurrence(id);
        return response.result!;
    },

    // Driver Recurrences
    createDriverRecurrence: async (payload: CreateDriverRecurrenceRequest): Promise<DriverRecurrenceResponse> => {
        const response = await recurrenceAPI.createDriverRecurrence(payload);
        return response.result!;
    },

    findAllDriverRecurrences: async (): Promise<DriverRecurrenceResponse[]> => {
        const response = await recurrenceAPI.findAllDriverRecurrences();
        return response.result || [];
    },

    findDriverRecurrenceById: async (id: Id): Promise<DriverRecurrenceResponse> => {
        const response = await recurrenceAPI.findDriverRecurrenceById(id);
        return response.result!;
    },

    findDriverRecurrenceByDriverId: async (driverId: Id): Promise<DriverRecurrenceResponse | null> => {
        const response = await recurrenceAPI.findDriverRecurrenceByDriverId(driverId);
        return response.result || null;
    },

    updateDriverRecurrence: async (id: Id, payload: UpdateDriverRecurrenceRequest): Promise<DriverRecurrenceResponse> => {
        const response = await recurrenceAPI.updateDriverRecurrence(id, payload);
        return response.result!;
    },

    incrementDriverRecurrenceUsage: async (id: Id): Promise<DriverRecurrenceResponse> => {
        const response = await recurrenceAPI.incrementDriverRecurrenceUsage(id);
        return response.result!;
    },

    deleteDriverRecurrence: async (id: Id): Promise<DriverRecurrenceResponse> => {
        const response = await recurrenceAPI.deleteDriverRecurrence(id);
        return response.result!;
    },

    // Service Type Recurrences
    createServiceTypeRecurrence: async (payload: CreateServiceTypeRecurrenceRequest): Promise<ServiceTypeRecurrenceResponse> => {
        const response = await recurrenceAPI.createServiceTypeRecurrence(payload);
        return response.result!;
    },

    findAllServiceTypeRecurrences: async (): Promise<ServiceTypeRecurrenceResponse[]> => {
        const response = await recurrenceAPI.findAllServiceTypeRecurrences();
        return response.result || [];
    },

    findServiceTypeRecurrenceById: async (id: Id): Promise<ServiceTypeRecurrenceResponse> => {
        const response = await recurrenceAPI.findServiceTypeRecurrenceById(id);
        return response.result!;
    },

    findServiceTypeRecurrenceByName: async (name: string): Promise<ServiceTypeRecurrenceResponse | null> => {
        const response = await recurrenceAPI.findServiceTypeRecurrenceByName(name);
        return response.result || null;
    },

    updateServiceTypeRecurrence: async (id: Id, payload: UpdateServiceTypeRecurrenceRequest): Promise<ServiceTypeRecurrenceResponse> => {
        const response = await recurrenceAPI.updateServiceTypeRecurrence(id, payload);
        return response.result!;
    },

    incrementServiceTypeRecurrenceUsage: async (id: Id): Promise<ServiceTypeRecurrenceResponse> => {
        const response = await recurrenceAPI.incrementServiceTypeRecurrenceUsage(id);
        return response.result!;
    },

    deleteServiceTypeRecurrence: async (id: Id): Promise<ServiceTypeRecurrenceResponse> => {
        const response = await recurrenceAPI.deleteServiceTypeRecurrence(id);
        return response.result!;
    },
};

