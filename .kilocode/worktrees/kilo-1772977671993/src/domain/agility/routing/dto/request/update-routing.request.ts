import type { RoutingStatus, RoutingType } from '../types'

import type { RoutingPointRequest } from './routing-point.request'

/**
 * DTO for updating a routing
 * Maps to UpdateRoutingDto from backend
 * All fields are optional for PATCH operations
 */
export interface UpdateRoutingRequest {
    /** Routing name - optional */
    name?: string

    /** Description - optional */
    description?: string

    /** Routing date - optional */
    date?: string

    /** Driver ID to assign - optional */
    driverId?: string

    /** Vehicle ID to assign - optional */
    vehicleId?: string

    /** Offer configuration - optional */
    offer?: {
        publicOffer?: boolean
        offerType?: string
        offerTime?: string
        totalValue?: number
        broadcastRadiusKm?: number
    }

    /** Origin/starting point - optional */
    origin?: RoutingPointRequest

    /** Return/ending point - optional */
    return?: RoutingPointRequest

    /** Origin address ID - optional */
    originAddressId?: string

    /** Origin latitude - optional */
    originLatitude?: number

    /** Origin longitude - optional */
    originLongitude?: number

    /** Origin address description - optional */
    originAddress?: string

    /** Return address ID - optional */
    returnAddressId?: string

    /** Return latitude - optional */
    returnLatitude?: number

    /** Return longitude - optional */
    returnLongitude?: number

    /** Return address description - optional */
    returnAddress?: string

    /** Return to origin point after completing services - optional */
    returnToOrigin?: boolean

    /** Routing type (SERVICE or PRODUCT) - optional */
    routingType?: RoutingType

    /** Service IDs - optional */
    serviceIds?: string[]

    /** Routing status - optional */
    status?: RoutingStatus
}



