/**
 * DTO for updating a driver
 * Maps to UpdateDriverDto from backend
 * All fields are optional for PATCH operations
 */
export interface UpdateDriverRequest {
    /** License number (CNH) - optional */
    licenseNumber?: string

    /** License category - optional */
    licenseCategory?: string

    /** License expiry date - optional */
    licenseExpiry?: string

    /** Work days (comma-separated or pattern) - optional */
    workDays?: string

    /** Work start time - optional */
    workStartTime?: string

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

    /** Time window start in seconds since midnight - optional, range 0 to 86400 */
    timeWindowStart?: number

    /** Time window end in seconds since midnight - optional, range 0 to 86400 */
    timeWindowEnd?: number

    /** Maximum stops per day - optional, minimum 1 */
    maxStops?: number

    /** Is driver available - optional */
    isAvailable?: boolean

    /** Current latitude - optional, range -90 to 90 */
    currentLatitude?: number

    /** Current longitude - optional, range -180 to 180 */
    currentLongitude?: number
}

