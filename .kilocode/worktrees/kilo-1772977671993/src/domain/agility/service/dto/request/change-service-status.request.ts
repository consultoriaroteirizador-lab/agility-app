import type { ServiceStatus } from '../types'

/**
 * DTO for changing service status
 */
export interface ChangeServiceStatusRequest {
    /** New service status - required */
    status: ServiceStatus
}



