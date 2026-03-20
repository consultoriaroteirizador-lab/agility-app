import type { PaginationQuery } from '@/types/base'

/**
 * Query parameters for listing services
 */
export interface ListServicesRequest extends PaginationQuery {
    /** Filter by order ID - optional */
    orderId?: string

    /** Filter by assigned driver ID - optional */
    assignedToId?: string
}



