import type { CustomerType } from '../types'

/**
 * Customer response DTO
 * Maps to CustomerEntity.toJson() from backend
 */
export interface CustomerResponse {
    /** Customer unique identifier */
    id: string

    /** Keycloak user ID */
    keycloakUserId: string

    /** Email address */
    email: string

    /** First name */
    firstName: string | null

    /** Last name */
    lastName: string | null

    /** Full name (firstName + lastName) */
    fullName: string | null

    /** Display name (companyName or fullName) */
    displayName: string | null

    /** Phone number */
    phone: string | null

    /** Document number (CPF/CNPJ) */
    documentNumber: string | null

    /** Company name (if legal entity) */
    companyName: string | null

    /** Is legal entity */
    isLegalEntity: boolean

    /** Primary address ID */
    addressId: string | null

    /** Customer type */
    customerType: CustomerType

    /** Business segment */
    segment: string | null

    /** Custom fields */
    customFields: Record<string, any> | null

    /** Is active */
    isActive: boolean

    /** Is VIP */
    isVIP: boolean

    /** Is corporate */
    isCorporate: boolean

    /** Is regular */
    isRegular: boolean

    /** Has address */
    hasAddress: boolean

    /** Creation timestamp */
    createdAt: Date | string

    /** Last update timestamp */
    updatedAt: Date | string
}

