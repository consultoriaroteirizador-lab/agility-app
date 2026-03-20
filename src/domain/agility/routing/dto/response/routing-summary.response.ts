import type { RoutingStatus } from '../types'

/**
 * Routing Summary Response - dados básicos para listagem (payload leve)
 */
export interface RoutingSummaryResponse {
    /** Routing ID */
    id: string

    /** Routing code */
    code: string

    /** Routing name */
    name?: string | null

    /** Routing date */
    date: Date | string

    /** Status */
    status: RoutingStatus

    /** Driver ID */
    driverId?: string | null

    /** Vehicle ID */
    vehicleId?: string | null

    /** Services count */
    servicesCount: number

    /** Total distance in km */
    totalDistanceKm?: number | null

    /** Total duration in minutes */
    totalDurationMinutes?: number | null
}

