import type { RoutingStatus } from '../types'

/**
 * Service point - apenas dados essenciais para o mapa
 */
export interface ServicePointResponse {
    /** Service ID */
    id: string

    /** Sequence order in routing */
    sequenceOrder: number

    /** Latitude */
    latitude: number

    /** Longitude */
    longitude: number

    /** Service title */
    title?: string | null

    /** Service type */
    serviceType?: string | null

    /** Service status */
    status?: string | null
}

/**
 * Route segment - dados para renderizar trajeto no mapa
 */
export interface RouteSegmentResponse {
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

    /** Route status */
    status?: string | null
}

/**
 * Origin/Return point
 */
export interface OriginPointResponse {
    /** Latitude */
    latitude?: number | null

    /** Longitude */
    longitude?: number | null

    /** Address description */
    address?: string | null
}

/**
 * Routing Map Data Response - dados otimizados para renderização no mapa
 * Payload leve: apenas lat/long dos services e geometry das routes
 */
export interface RoutingMapDataResponse {
    /** Routing ID */
    id: string

    /** Routing code */
    code: string

    /** Routing status */
    status: RoutingStatus

    /** Origin point */
    origin: OriginPointResponse

    /** Return point (if different from origin) */
    return?: OriginPointResponse | null

    /** Return to origin flag */
    returnToOrigin: boolean

    /** Services with coordinates only */
    services: ServicePointResponse[]

    /** Route segments with geometry */
    routes: RouteSegmentResponse[]

    /** Total distance in km */
    totalDistanceKm?: number | null

    /** Total duration in minutes */
    totalDurationMinutes?: number | null
}

