/**
 * DTO for updating a customer address relationship
 * Maps to UpdateCustomerAddressDto from backend
 * All fields are optional for PATCH operations
 */
export interface UpdateCustomerAddressRequest {
    /** Indicates if this is the primary address - optional */
    isPrimary?: boolean

    /** Address type (HOME, WORK, DELIVERY, BILLING, etc.) - optional */
    addressType?: string

    /** Custom label for the address - optional */
    label?: string
}

