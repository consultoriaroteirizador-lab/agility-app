/**
 * Query params for broadcasting routings endpoint
 */
export interface BroadcastingQueryRequest {
    /** Driver current latitude (for distance filtering) */
    driverLatitude?: number

    /** Driver current longitude (for distance filtering) */
    driverLongitude?: number
}

