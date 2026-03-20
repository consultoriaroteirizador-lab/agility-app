/**
 * Address response DTO
 * Maps to AddressEntity.toJson() from backend
 */
export interface AddressResponse {
    /** Address unique identifier */
    id: string;

    /** Street name */
    street: string;

    /** Street number */
    number: string;

    /** Address complement */
    complement: string | null;

    /** District (Distrito) */
    district: string | null;

    /** Neighborhood (Bairro) */
    neighborhood: string | null;

    /** City name */
    city: string;

    /** State code (2 uppercase letters) */
    state: string;

    /** Postal code (CEP) */
    postalCode: string;

    /** Country code */
    country: string | null;

    /** Latitude coordinate */
    latitude: number;

    /** Longitude coordinate */
    longitude: number;

    /** Formatted full address string */
    formattedAddress: string;

    /** Creation timestamp */
    createdAt: Date | string;

    /** Last update timestamp */
    updatedAt: Date | string;
}

