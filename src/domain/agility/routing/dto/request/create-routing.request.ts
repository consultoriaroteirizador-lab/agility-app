import type { RoutingType } from '../types'

import type { RoutingOfferConfigRequest } from './routing-offer-config.request'
import type { RoutingPointRequest } from './routing-point.request'

/**
 * DTO for creating a new routing
 * Maps to CreateRoutingDto from backend
 */
export interface CreateRoutingRequest {
    /** Routing code (unique) - required */
    code: string

    /** Routing name - optional */
    name?: string

    /** Description - optional */
    description?: string

    /** Routing date - required */
    date: string

    /** Driver ID to assign - optional */
    driverId?: string

    /** Vehicle ID to assign - optional */
    vehicleId?: string

    /** Offer configuration - optional */
    offer?: RoutingOfferConfigRequest

    /** Origin/starting point - optional */
    origin?: RoutingPointRequest

    /** Return/ending point (if different from origin) - optional */
    return?: RoutingPointRequest

    /** Origin address ID (alternative to origin object) - optional */
    originAddressId?: string

    /** Origin latitude (alternative to origin object) - optional, range -90 to 90 */
    originLatitude?: number

    /** Origin longitude (alternative to origin object) - optional, range -180 to 180 */
    originLongitude?: number

    /** Origin address description (alternative to origin object) - optional */
    originAddress?: string

    /** Return address ID (alternative to return object) - optional */
    returnAddressId?: string

    /** Return latitude (alternative to return object) - optional, range -90 to 90 */
    returnLatitude?: number

    /** Return longitude (alternative to return object) - optional, range -180 to 180 */
    returnLongitude?: number

    /** Return address description (alternative to return object) - optional */
    returnAddress?: string

    /** Return to origin point after completing services - optional, default: true */
    returnToOrigin?: boolean

    /** Routing type (SERVICE or PRODUCT) - optional */
    routingType?: RoutingType

    /** Service IDs to add to routing - optional */
    serviceIds?: string[]

    /** Services to create inline with the routing (new services) - optional */
    services?: any[] // BatchServiceItemDto[] - using any[] for now to avoid circular dependency
}

