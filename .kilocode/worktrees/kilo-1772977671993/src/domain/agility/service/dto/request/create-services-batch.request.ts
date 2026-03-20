import type { CreateServiceRequest } from './create-service.request'

/**
 * Item for batch service creation (without routingId - it's set at batch level)
 */
export type BatchServiceItemRequest = Omit<CreateServiceRequest, 'routingId'>

/**
 * DTO for creating multiple services at once
 */
export interface CreateServicesBatchRequest {
    /** Routing ID to add all services to - optional */
    routingId?: string

    /** Array of services to create */
    services: BatchServiceItemRequest[]
}

/**
 * Response for batch creation
 */
export interface BatchCreationResult {
    /** Total services requested */
    total: number

    /** Successfully created count */
    created: number

    /** Failed count */
    failed: number

    /** Created services */
    services: any[]

    /** Errors for failed services */
    errors?: { index: number; error: string }[]
}

