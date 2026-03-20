/**
 * DTO for adding an address to a customer
 * Maps to CreateCustomerAddressDto from backend
 */
export interface CreateCustomerAddressRequest {
    /** Address ID - required */
    addressId: string

    /** Indicates if this is the primary address - optional, default false */
    isPrimary?: boolean

    /** Address type (HOME, WORK, DELIVERY, BILLING, etc.) - optional */
    addressType?: string

    /** Custom label for the address - optional */
    label?: string
}

