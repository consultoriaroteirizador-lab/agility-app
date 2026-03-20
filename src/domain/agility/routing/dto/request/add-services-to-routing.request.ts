import type { BatchServiceItemRequest } from '../../../service/dto/request/create-services-batch.request'

/**
 * DTO for adding services to an existing routing
 */
export interface AddServicesToRoutingRequest {
    /** New services to create and add to the routing - optional */
    services?: BatchServiceItemRequest[]

    /** IDs of existing services to link to this routing - optional */
    existingServiceIds?: string[]
}

/**
 * Response for adding services to routing
 */
export interface AddServicesToRoutingResponse {
    /** Total new services created */
    created: number

    /** Total existing services linked */
    linked: number

    /** Total failed operations */
    failed: number

    /** Created services */
    newServices: any[]

    /** Linked service IDs */
    linkedServiceIds: string[]

    /** Errors */
    errors?: { type: 'create' | 'link'; index?: number; id?: string; error: string }[]
}

