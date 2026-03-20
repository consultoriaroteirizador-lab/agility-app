export interface RouteRecurrenceResponse {
    id: string;
    label: string;
    addressId?: string;
    addressData?: Record<string, any>;
    serviceType?: string;
    driverId?: string;
    usageCount: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

