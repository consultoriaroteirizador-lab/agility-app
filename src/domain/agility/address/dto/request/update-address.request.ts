/**
 * DTO for updating an address
 * Maps to UpdateAddressDto from backend
 * All fields are optional for PATCH operations
 */
export interface UpdateAddressRequest {
    /** Street name - optional, max 200 characters */
    street?: string;

    /** Street number - optional, max 20 characters */
    number?: string;

    /** Address complement - optional, max 100 characters */
    complement?: string;

    /** District (Distrito) - optional, max 100 characters */
    district?: string;

    /** Neighborhood (Bairro) - optional, max 100 characters */
    neighborhood?: string;

    /** City name - optional, max 100 characters */
    city?: string;

    /** State code - optional, 2 uppercase letters (e.g., SP, RJ, MG) */
    state?: string;

    /** Postal code (CEP) - optional, format XXXXX-XXX or XXXXXXXX */
    postalCode?: string;

    /** Latitude coordinate - optional, range -90 to 90 */
    latitude?: number;

    /** Longitude coordinate - optional, range -180 to 180 */
    longitude?: number;

    /** Country code - optional, max 2 characters */
    country?: string;
}

