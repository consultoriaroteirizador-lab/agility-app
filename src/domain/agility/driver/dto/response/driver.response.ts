import type { CollaboratorResponse } from '@/domain/agility/collaborator/dto/response/collaborator.response'

/**
 * Driver response DTO
 * Maps to DriverEntity.toJson() from backend
 */
export interface DriverResponse {
    /** Driver unique identifier */
    id: string

    /** Collaborator ID (if driver is from collaborator) */
    collaboratorId: string | null

    /** Collaborator data (if driver is from collaborator) */
    collaborator: CollaboratorResponse | null

    /** Provider ID (if driver is from provider) */
    providerId: string | null

    /** Provider data (if driver is from provider) */
    provider: any | null

    /** License number (CNH) */
    licenseNumber: string

    /** License category */
    licenseCategory: string

    /** License expiry date */
    licenseExpiry: Date | string | null

    /** Work days */
    workDays: string

    /** Work start time */
    workStartTime: string

    /** Work end time */
    workEndTime: string | null

    /** Team code */
    teamCode: string | null

    /** Supervisor */
    supervisor: string | null

    /** Cost center */
    costCenter: string | null

    /** Current latitude */
    currentLatitude: number | null

    /** Current longitude */
    currentLongitude: number | null

    /** Start latitude */
    startLatitude: number | null

    /** Start longitude */
    startLongitude: number | null

    /** Start city */
    startCity: string | null

    /** Is available */
    isAvailable: boolean

    /** Notes */
    notes: string | null

    /** Is from collaborator */
    isFromCollaborator: boolean

    /** Is from provider */
    isFromProvider: boolean

    /** Display name */
    displayName: string | null

    /** Email */
    email: string | null

    /** Has start location */
    hasStartLocation: boolean

    /** Has current location */
    hasCurrentLocation: boolean

    /** Is in team */
    isInTeam: boolean

    /** Is license expired */
    isLicenseExpired: boolean

    /** Skills for ORS optimization */
    skills: number[] | null

    /** Time window start in seconds since midnight */
    timeWindowStart: number | null

    /** Time window end in seconds since midnight */
    timeWindowEnd: number | null

    /** Maximum stops per day */
    maxStops: number | null

    /** Creation timestamp */
    createdAt: Date | string

    /** Last update timestamp */
    updatedAt: Date | string
}

