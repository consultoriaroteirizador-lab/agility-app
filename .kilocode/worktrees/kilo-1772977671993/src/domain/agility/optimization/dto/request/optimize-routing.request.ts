import type { OptimizationMethod, OptimizeBy } from '../types'

/**
 * DTO for optimizing routing
 * Maps to OptimizeRoutingDto from backend
 */
export interface OptimizeRoutingRequest {
    /** Routing ID to be optimized - required */
    routingId: string

    /** Optimization method - required */
    method: OptimizationMethod

    /** Optimize by distance or time - optional, default: 'distance' */
    optimizeBy?: OptimizeBy

    /** Return to origin after last service - optional, default: true */
    returnToOrigin?: boolean

    /** Maximum stops per vehicle (ORS only) - optional, range 1-100 */
    maxStopsPerVehicle?: number
}



