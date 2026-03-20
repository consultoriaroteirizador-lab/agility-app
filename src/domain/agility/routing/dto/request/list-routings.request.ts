import type { RoutingStatus } from '../types'

/**
 * Query parameters for listing routings
 */
export interface ListRoutingsRequest {
    /** Filter by status - optional */
    status?: RoutingStatus

    /** Filter by driver ID - optional */
    driverId?: string

    /** Filter by date - optional */
    date?: string

    /** If true, returns aggregated summary instead of list - optional */
    summary?: boolean
}



