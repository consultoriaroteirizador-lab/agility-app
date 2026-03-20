import type { CustomerType } from '../types'

/**
 * Query parameters for listing customers
 */
export interface ListCustomersRequest {
    /** Filter by customer type - optional */
    type?: CustomerType
}

