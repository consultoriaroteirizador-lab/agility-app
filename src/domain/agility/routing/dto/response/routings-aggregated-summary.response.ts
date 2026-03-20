/**
 * Aggregated Summary Response - valores somados de todas as routings
 */
export interface RoutingsAggregatedSummaryResponse {
    /** Total number of routings */
    totalRoutings: number

    /** Total number of services across all routings */
    totalServices: number

    /** Total distance in km (sum of all routings) - optional */
    totalDistanceKm?: number

    /** Total duration in minutes (sum of all routings) - optional */
    totalDurationMinutes?: number

    /** Average distance per routing in km - optional */
    averageDistanceKm?: number

    /** Average duration per routing in minutes - optional */
    averageDurationMinutes?: number

    /** Count of routings by status */
    countByStatus: Record<string, number>
}

