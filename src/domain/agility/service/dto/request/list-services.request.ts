/**
 * Query parameters for listing services
 */
export interface ListServicesRequest {
    /** Filter by order ID - optional */
    orderId?: string

    /** Filter by assigned driver ID - optional */
    assignedToId?: string

    /** Filter by routing ID - optional */
    routingId?: string

    /** Pagination - page number */
    page?: number

    /** Pagination - items per page */
    limit?: number
}



