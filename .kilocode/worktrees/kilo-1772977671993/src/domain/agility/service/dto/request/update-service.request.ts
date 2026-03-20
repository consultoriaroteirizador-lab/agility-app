import type { ServiceStatus } from '../types'

import type { CreateServiceRequest } from './create-service.request'

/**
 * DTO for updating a service
 * Maps to UpdateServiceDto from backend
 * All fields from CreateServiceRequest are optional, plus:
 */
export interface UpdateServiceRequest extends Partial<CreateServiceRequest> {
    /** Service status - optional */
    status?: ServiceStatus

    /** Completion notes - optional */
    completionNotes?: string

    /** Previous service ID (for reordering) - optional */
    previousServiceId?: string
}



