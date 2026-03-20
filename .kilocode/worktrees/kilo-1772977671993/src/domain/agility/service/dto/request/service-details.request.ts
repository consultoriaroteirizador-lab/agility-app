import type { PriorityLevel, VehicleRequirements } from '../types'

/**
 * Service details DTO
 */
export interface ServiceDetailsRequest {
    /** Service title - optional */
    title?: string

    /** Problem description - optional */
    problemDescription?: string

    /** Priority - optional */
    priority?: PriorityLevel

    /** Service type - optional */
    serviceType?: string

    /** Required skills (array of numbers for ORS optimization) - optional */
    requiredSkills?: number[]

    /** Vehicle requirements - optional */
    requiredVehicleSpecifications?: VehicleRequirements

    /** Technician IDs - optional */
    technician?: string[]

    /** Helper IDs - optional */
    helper?: string[]
}



