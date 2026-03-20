import type { CustomerType } from '../types'

/**
 * DTO for creating a new customer
 * Maps to CreateCustomerDto from backend
 */
export interface CreateCustomerRequest {
    /** Customer email - required */
    email: string

    /** Customer password (min 6 characters) - required */
    password: string

    /** Indicates if password is temporary - optional */
    temporaryPassword?: boolean

    /** First name - optional */
    firstName?: string

    /** Last name - optional */
    lastName?: string

    /** Phone number - optional */
    phone?: string

    /** Document number (CPF/CNPJ) - optional */
    documentNumber?: string

    /** Company name (if legal entity) - optional */
    companyName?: string

    /** Indicates if customer is a legal entity - optional */
    isLegalEntity?: boolean

    /** Customer type - optional */
    customerType?: CustomerType

    /** Business segment - optional */
    segment?: string

    /** Custom fields - optional */
    customFields?: Record<string, any>

    /** Primary address ID - optional */
    addressId?: string
}

