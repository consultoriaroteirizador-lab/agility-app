import type { AddressResponse } from '@/domain/agility/address/dto/response/address.response'

/**
 * Customer Address relationship response DTO
 * Maps to CustomerAddressResponseDto from backend
 */
export interface CustomerAddressResponse {
    /** Relationship ID */
    id: string

    /** Customer ID */
    customerId: string

    /** Address ID */
    addressId: string

    /** Indicates if this is the primary address */
    isPrimary: boolean

    /** Address type (HOME, WORK, DELIVERY, BILLING, etc.) */
    addressType?: string

    /** Custom label for the address */
    label?: string

    /** Complete address data */
    address: AddressResponse

    /** Creation timestamp */
    createdAt: Date | string

    /** Last update timestamp */
    updatedAt: Date | string
}

