/**
 * DTO for creating a new driver
 * Maps to CreateDriverDto from backend
 */
export interface CreateDriverRequest {
    /** Collaborator ID (for CLT drivers) - optional, must have collaboratorId OR providerId */
    collaboratorId?: string

    /** Provider ID (for third-party drivers) - optional, must have collaboratorId OR providerId */
    providerId?: string

    /** License number (CNH) - required */
    licenseNumber: string

    /** License category - required */
    licenseCategory: string

    /** License expiry date - optional */
    licenseExpiry?: string

    /** Work days (comma-separated or pattern) - required */
    workDays: string

    /** Work start time - required */
    workStartTime: string

    /** Work end time - optional */
    workEndTime?: string

    /** Team code - optional */
    teamCode?: string

    /** Supervisor name or ID - optional */
    supervisor?: string

    /** Cost center - optional */
    costCenter?: string

    /** Start latitude - optional, range -90 to 90 */
    startLatitude?: number

    /** Start longitude - optional, range -180 to 180 */
    startLongitude?: number

    /** Start city - optional */
    startCity?: string

    /** Notes - optional */
    notes?: string

    /** Skills for ORS optimization (array of numbers) - optional */
    skills?: number[]

    /** Time window start in seconds since midnight (e.g., 28800 = 08:00) - optional, range 0 to 86400 */
    timeWindowStart?: number

    /** Time window end in seconds since midnight (e.g., 64800 = 18:00) - optional, range 0 to 86400 */
    timeWindowEnd?: number

    /** Maximum stops per day - optional, minimum 1 */
    maxStops?: number
}

