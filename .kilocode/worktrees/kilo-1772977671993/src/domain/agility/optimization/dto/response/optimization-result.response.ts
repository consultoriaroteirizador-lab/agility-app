import type { OptimizationMethod } from '../types'

/**
 * Service response (partial structure)
 * The actual structure depends on the service entity
 */
export interface ServiceResponse {
    id: string
    [key: string]: any
}

/**
 * Optimization result response DTO
 * Maps to OptimizationResultDto from backend
 */
export interface OptimizationResultResponse {
    /** Whether optimization was successful */
    success: boolean

    /** Method used */
    method: OptimizationMethod

    /** Routing ID */
    routingId: string

    /** Service IDs in optimized order */
    orderedServiceIds: string[]

    /** Complete services in optimized order */
    orderedServices?: ServiceResponse[]

    /** Total distance in km */
    totalDistance: number

    /** Total estimated duration in minutes */
    totalDuration: number

    /** Number of optimized services */
    servicesCount: number

    /** IDs of unassigned services */
    unassignedServices: string[]

    /** Warnings */
    warnings: string[]

    /** Processing time in ms */
    durationMs: number
}



