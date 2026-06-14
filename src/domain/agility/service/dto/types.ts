/**
 * Enums and types shared between request and response DTOs
 */

export enum ServiceStatus {
    PENDING = 'PENDING',
    ASSIGNED = 'ASSIGNED',
    IN_PROGRESS = 'IN_PROGRESS',     // A caminho do cliente
    IN_ATTENDANCE = 'IN_ATTENDANCE', // Em atendimento (chegou no cliente)
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    CANCELED = 'CANCELED',
}

export enum ServiceType {
    DELIVERY = 'DELIVERY',
    PICKUP = 'PICKUP',
    SERVICE = 'SERVICE',
    TRANSFER = 'TRANSFER', // Transferência (CD↔CD, loja↔loja) — cargo entre 2 pontos fixos
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

/**
 * Payment method types for COD (Cash on Delivery)
 */
export enum PaymentMethodType {
    CASH = 'CASH',               // Dinheiro
    PIX = 'PIX',                 // PIX
    CARD_DEBIT = 'CARD_DEBIT',   // Cartão de débito
    CARD_CREDIT = 'CARD_CREDIT', // Cartão de crédito
}



