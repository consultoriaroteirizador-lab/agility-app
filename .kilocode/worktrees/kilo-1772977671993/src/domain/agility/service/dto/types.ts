/**
 * Enums and types shared between request and response DTOs
 */

export enum ServiceStatus {
    PENDING = 'PENDING',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    CANCELED = 'CANCELED',
    ASSIGNED = 'ASSIGNED',
}

export enum ServiceType {
    INSTALLATION = 'INSTALLATION',
    DELIVERY = 'DELIVERY',
    MAINTENANCE = 'MAINTENANCE',
    EXCHANGE = 'EXCHANGE',
    PICKUP = 'PICKUP',
}

export enum PriorityLevel {
    LOW = 'LOW',
    NORMAL = 'NORMAL',
    HIGH = 'HIGH',
    URGENT = 'URGENT',
    CRITICAL = 'CRITICAL',
}

export enum PersonType {
    PF = 'PF',
    PJ = 'PJ',
}

/**
 * Vehicle requirements interface
 */
export interface VehicleRequirements {
    LoadCapacity?: {
        dimensions?: string[]
        weight?: string[]
        loadType?: string[]
    }
    type?: string
    purpose?: string
    minimalWheels?: string
    minimalSeats?: string
}



