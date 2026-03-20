/**
 * Service schedule DTO
 */
export interface ServiceScheduleRequest {
    /** Request date - optional */
    requestDate?: string

    /** Promised service window - optional */
    promisedServiceWindow?: {
        inicialDate?: string
        endDate?: string
    }

    /** Priority - optional */
    priority?: string

    /** Scheduled time details - optional */
    scheduledTime?: {
        date?: string
        startTime?: string
        EstimatedCompletionTime?: string
        estimatedDuration?: string
    }
}



