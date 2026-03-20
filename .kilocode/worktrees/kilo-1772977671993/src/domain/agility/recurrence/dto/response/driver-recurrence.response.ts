export interface DriverRecurrenceResponse {
    id: string;
    driverId: string;
    label: string;
    skills?: string[];
    usageCount: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

