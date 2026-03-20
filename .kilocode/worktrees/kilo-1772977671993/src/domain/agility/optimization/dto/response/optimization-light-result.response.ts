import type { OptimizationMethod } from '../types'

/**
 * Service point - apenas dados essenciais para o mapa
 */
export interface ServicePointLightResponse {
    /** Service ID */
    id: string

    /** Sequence order */
    sequenceOrder: number

    /** Latitude */
    latitude: number

    /** Longitude */
    longitude: number
}

/**
 * Route segment - dados para renderizar trajeto
 */
export interface RouteSegmentLightResponse {
    /** Route ID */
    id: string

    /** Sequence order */
    sequenceOrder: number

    /** Origin service ID */
    originServiceId: string

    /** Destination service ID */
    destinationServiceId: string

    /** Distance in km */
    distanceKm?: number | null

    /** Duration in minutes */
    durationMinutes?: number | null

    /** Geometry (polyline encoded) */
    geometry?: string | null
}

/**
 * Optimization Light Result Response
 * Payload enxuto: apenas IDs, coordenadas e geometry (sem dados completos dos serviços)
 */
export interface OptimizationLightResultResponse {
    /** Success flag */
    success: boolean

    /** Method used */
    method: OptimizationMethod

    /** Routing ID */
    routingId: string

    /** Ordered service IDs */
    orderedServiceIds: string[]

    /** Ordered points (id, lat, long only) */
    orderedPoints: ServicePointLightResponse[]

    /** Route segments with geometry */
    routes: RouteSegmentLightResponse[]

    /** Total distance in km */
    totalDistanceKm?: number | null

    /** Total duration in minutes */
    totalDurationMinutes?: number | null

    /** Services count */
    servicesCount: number

    /** Unassigned service IDs */
    unassignedServices?: string[]

    /** Warnings */
    warnings?: string[]
}

