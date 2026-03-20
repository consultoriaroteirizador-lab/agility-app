import type { AddressResponse } from '../../address/dto'
import type { ServiceStatus, ServiceType, PriorityLevel, PersonType, VehicleRequirements } from '../types'

/**
 * Service response DTO
 * Maps to ServiceEntity.toJson() from backend
 */
export interface ServiceResponse {
    /** Service unique identifier */
    id: string

    /** Routing ID */
    routingId: string | null

    /** Sequence order in routing */
    sequenceOrder: number | null

    /** Previous service ID */
    previousServiceId: string | null

    /** Service type */
    serviceType: ServiceType | null

    /** Status */
    status: ServiceStatus

    /** Responsible person name */
    responsible: string | null

    /** Client person type */
    clientPersonType: PersonType | null

    /** Client email */
    clientEmail: string | null

    /** Client phone */
    clientPhone: string | null

    /** Identification code */
    identificationCode: string | null

    /** Fantasy name / Trade name */
    fantasyName: string | null

    /** Tax number (CPF/CNPJ) */
    taxNumber: string | null

    /** Service order number */
    serviceOrder: string | null

    /** Order origin */
    orderOrigin: string | null

    /** Invoicing info */
    invoicing: string | null

    /** Offer value */
    offerValue: number | null

    /** Address ID */
    addressId: string | null

    /** Customer ID */
    customerId: string | null

    /** Title */
    title: string | null

    /** Problem description */
    problemDescription: string | null

    /** Priority */
    priority: PriorityLevel | null

    /** Required skills */
    requiredSkills: number[] | null

    /** Vehicle requirements */
    vehicleRequirements: VehicleRequirements | null

    /** Assigned driver ID */
    assignedToId: string | null

    /** Technician ID */
    technicianId: string | null

    /** Helper ID */
    helperId: string | null

    /** Request date */
    requestDate: Date | string | null

    /** Promised start date */
    promisedStartDate: Date | string | null

    /** Promised end date */
    promisedEndDate: Date | string | null

    /** Scheduled date */
    scheduledDate: Date | string | null

    /** Scheduled start time */
    scheduledStartTime: string | null

    /** Estimated duration */
    estimatedDuration: number | null

    /** Estimated completion time */
    estimatedCompletionTime: string | null

    /** Start date */
    startDate: Date | string | null

    /** End date */
    endDate: Date | string | null

    /** Completion notes */
    completionNotes: string | null

    /** Description */
    description: string | null

    /** Category */
    category: string | null

    /** Price */
    price: number | null

    /** Order ID */
    orderId: string | null

    /** Is pending */
    isPending: boolean

    /** Is in progress */
    isInProgress: boolean

    /** Is completed */
    isCompleted: boolean

    /** Is canceled */
    isCanceled: boolean

    /** Is failed */
    isFailed: boolean

    /** Is assigned */
    isAssigned: boolean

    /** Has driver */
    hasDriver: boolean

    /** Has technician */
    hasTechnician: boolean

    /** Has helper */
    hasHelper: boolean

    /** Is in routing */
    isInRouting: boolean

    /** Is first in sequence */
    isFirstInSequence: boolean

    /** Actual duration in minutes */
    actualDurationMinutes: number | null

    /** Full address object (when available) */
    address: AddressResponse | null

    /** Creation timestamp */
    createdAt: Date | string

    /** Last update timestamp */
    updatedAt: Date | string
}



