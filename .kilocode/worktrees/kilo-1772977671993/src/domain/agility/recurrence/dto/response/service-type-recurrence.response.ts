export interface ServiceTypeRecurrenceResponse {
    id: string;
    name: string;
    serviceType?: string;
    avgDuration?: number;
    usageCount: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

