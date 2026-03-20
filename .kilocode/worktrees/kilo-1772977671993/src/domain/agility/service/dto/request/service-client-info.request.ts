import type { PersonType } from '../types'

/**
 * Service client information DTO
 */
export interface ServiceClientInfoRequest {
    /** Responsible person name - optional */
    responsible?: string

    /** Client person type - optional */
    personType?: PersonType

    /** Client email - optional */
    email?: string

    /** Client phone - optional */
    phoneNumber?: string

    /** Identification code - optional */
    identificationCode?: string

    /** Fantasy name / Trade name - optional */
    fantasyName?: string

    /** Tax number (CPF/CNPJ) - optional */
    taxNumber?: string

    /** Service order number - optional */
    serviceOrder?: string

    /** Order origin - optional */
    orderOrigin?: string

    /** Invoicing info - optional */
    invoicing?: string
}



