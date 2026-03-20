/**
 * Enums and types shared between request and response DTOs
 */

export enum RoutingProfile {
    LAST_MILE = 'LAST_MILE',
    FIELD_SERVICE = 'FIELD_SERVICE',
    PICKUP_DELIVERY = 'PICKUP_DELIVERY',
    ENTERPRISE = 'ENTERPRISE',
}

export enum BusinessSegment {
    LOGISTICS = 'LOGISTICS',
    FIELD_SERVICE = 'FIELD_SERVICE',
    ECOMMERCE = 'ECOMMERCE',
    UTILITIES = 'UTILITIES',
    HEALTHCARE = 'HEALTHCARE',
    FOOD_DELIVERY = 'FOOD_DELIVERY',
    OTHER = 'OTHER',
}

export enum OptimizationMethod {
    ORS = 'ORS',
    DISTANCE = 'DISTANCE',
    MANUAL = 'MANUAL',
}

export interface Owner {
    email: string
    firstName: string
    lastName: string
    phone?: string
}

export interface CompanyLimits {
    maxDrivers: number | null
    maxVehicles: number | null
    maxRoutingsPerDay: number | null
    maxServicesPerRouting: number | null
}

