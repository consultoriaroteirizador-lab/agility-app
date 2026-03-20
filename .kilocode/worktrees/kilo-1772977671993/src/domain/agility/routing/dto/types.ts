/**
 * Enums and types shared between request and response DTOs
 */

export enum RoutingStatus {
    DRAFT = 'DRAFT',
    OPTIMIZED = 'OPTIMIZED',
    PENDING_ASSIGNMENT = 'PENDING_ASSIGNMENT',
    BROADCASTING = 'BROADCASTING',
    ASSIGNED = 'ASSIGNED',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
}

export enum OfferType {
    PROXIMITY = 'PROXIMITY',
    ALL = 'ALL',
}

export enum RoutingType {
    SERVICE = 'SERVICE', // Roteirização de serviços
    PRODUCT = 'PRODUCT', // Roteirização de produtos
}



