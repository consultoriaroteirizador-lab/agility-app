import type { RoutingStatus, OfferType, RoutingType } from '../types'

/**
 * Return point structure
 */
export interface ReturnPoint {
    latitude: number | null
    longitude: number | null
    address: string | null
}

/**
 * Routing response DTO
 * Maps to RoutingEntity.toJson() from backend
 */
export interface RoutingResponse {
    /** Routing unique identifier */
    id: string

    /** Routing code */
    code: string

    /** Routing name */
    name: string | null

    /** Description */
    description: string | null

    /** Routing date */
    date: Date | string

    /** Status */
    status: RoutingStatus

    /** Driver ID */
    driverId: string | null

    /** Vehicle ID */
    vehicleId: string | null

    /** Is public offer (broadcast) */
    publicOffer: boolean

    /** Offer type */
    offerType: OfferType | null

    /** Routing type (SERVICE or PRODUCT) */
    routingType: RoutingType | null

    /** Offer time limit */
    offerTime: string | null

    /** Total value */
    totalValue: number | null

    /** Broadcast radius in km */
    broadcastRadiusKm: number | null

    /** Total services */
    totalServices: number | null

    /** Total distance in km */
    totalDistanceKm: number | null

    /** Total duration in minutes */
    totalDurationMinutes: number | null

    /** Origin latitude */
    originLatitude: number | null

    /** Origin longitude */
    originLongitude: number | null

    /** Origin address */
    originAddress: string | null

    /** Origin address ID */
    originAddressId: string | null

    /** Return latitude */
    returnLatitude: number | null

    /** Return longitude */
    returnLongitude: number | null

    /** Return address */
    returnAddress: string | null

    /** Return address ID */
    returnAddressId: string | null

    /** Return to origin */
    returnToOrigin: boolean

    /** Has origin */
    hasOrigin: boolean

    /** Has return */
    hasReturn: boolean

    /** Return point */
    returnPoint: ReturnPoint

    /** Started at timestamp */
    startedAt: Date | string | null

    /** Completed at timestamp */
    completedAt: Date | string | null

    /** Actual duration in minutes */
    actualDurationMinutes: number | null

    /** Is draft */
    isDraft: boolean

    /** Is pending assignment */
    isPendingAssignment: boolean

    /** Is broadcasting */
    isBroadcasting: boolean

    /** Is assigned */
    isAssigned: boolean

    /** Is in progress */
    isInProgress: boolean

    /** Is completed */
    isCompleted: boolean

    /** Is cancelled */
    isCancelled: boolean

    /** Has driver */
    hasDriver: boolean

    /** Has vehicle */
    hasVehicle: boolean

    /** Creation timestamp */
    createdAt: Date | string

    /** Last update timestamp */
    updatedAt: Date | string
}



