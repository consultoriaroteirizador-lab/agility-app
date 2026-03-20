/**
 * Request body for accepting a broadcasting routing
 */
export interface AcceptRoutingRequest {
    /** Driver current latitude (for distance validation) - optional, uses driver profile if not provided */
    driverLatitude?: number

    /** Driver current longitude (for distance validation) - optional, uses driver profile if not provided */
    driverLongitude?: number
}

