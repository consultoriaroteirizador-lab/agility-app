/**
 * DTO for creating a new address
 * Maps to CreateAddressDto from backend
 */
export interface CreateAddressRequest {
    /** Street name - required, max 200 characters */
    street: string;

    /** Street number - required, max 20 characters */
    number: string;

    /** Address complement - optional, max 100 characters */
    complement?: string;

    /** District (Distrito) - optional, max 100 characters */
    district?: string;

    /** Neighborhood (Bairro) - optional, max 100 characters */
    neighborhood?: string;

    /** City name - required, max 100 characters */
    city: string;

    /** State code - required, 2 uppercase letters (e.g., SP, RJ, MG) */
    state: string;

    /** Postal code (CEP) - required, format XXXXX-XXX or XXXXXXXX */
    postalCode: string;

    /** Latitude coordinate - required, range -90 to 90 */
    latitude: number;

    /** Longitude coordinate - required, range -180 to 180 */
    longitude: number;

    /** Country code - optional, max 2 characters, default 'BR' */
    country?: string;
}

