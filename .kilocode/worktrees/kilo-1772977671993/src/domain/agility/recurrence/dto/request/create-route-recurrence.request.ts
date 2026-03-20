export interface CreateRouteRecurrenceRequest {
    label: string;
    addressId?: string;
    addressData?: Record<string, any>;
    serviceType?: string;
    driverId?: string;
}

