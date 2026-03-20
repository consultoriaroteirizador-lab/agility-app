import type { ServiceType, PriorityLevel, PersonType } from '../types'

import type { ServiceAddressRequest } from './service-address.request'
import type { ServiceClientInfoRequest } from './service-client-info.request'
import type { ServiceDetailsRequest } from './service-details.request'
import type { ServiceMaterialRequest } from './service-material.request'
import type { ServiceScheduleRequest } from './service-schedule.request'

/**
 * DTO for creating a new service
 * Maps to CreateServiceDto from backend
 */
export interface CreateServiceRequest {
    /** Routing ID to add this service to - optional */
    routingId?: string

    /** Customer ID (if service is for a registered customer) - optional */
    customerId?: string

    /** Sequence order in routing - optional, minimum 0 */
    sequenceOrder?: number

    /** Service type - optional */
    serviceType?: ServiceType

    /** Priority (flat format) - optional */
    priority?: PriorityLevel

    /** Responsible person name (flat format) - optional */
    responsible?: string

    /** Client person type (flat format) - optional */
    clientPersonType?: PersonType

    /** Tax number (CPF/CNPJ) (flat format) - optional */
    taxNumber?: string

    /** Client phone (flat format) - optional */
    phoneNumber?: string

    /** Client email (flat format) - optional */
    email?: string

    /** Fantasy name / Trade name (flat format) - optional */
    fantasyName?: string

    /** Service title (flat format) - optional */
    title?: string

    /** Estimated duration in minutes (flat format) - optional, minimum 0 */
    estimatedDuration?: number

    /** Required skills (flat format) - optional */
    requiredSkills?: number[]

    /** Client/customer information - optional */
    informations?: ServiceClientInfoRequest

    /** Offer value - optional */
    offer?: {
        value?: string
    }

    /** Service address - optional */
    address?: ServiceAddressRequest

    /** Existing address ID - optional */
    addressId?: string

    /** Service details - optional */
    serviceDetails?: ServiceDetailsRequest

    /** Schedule - optional */
    schedule?: ServiceScheduleRequest

    /** Materials - optional */
    materials?: ServiceMaterialRequest[]

    /** Description (legacy) - optional */
    description?: string

    /** Category (legacy) - optional */
    category?: string

    /** Price (legacy) - optional */
    price?: number

    /** Order ID (legacy) - optional */
    orderId?: string

    /** Driver ID to assign - optional */
    assignedToId?: string
}



