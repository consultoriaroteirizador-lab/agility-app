/**
 * Service address DTO
 */
export interface ServiceAddressRequest {
    /** CEP/Postal code - optional */
    CEP?: string

    /** Street - optional */
    street?: string

    /** Number - optional */
    number?: string

    /** Complement - optional */
    complement?: string

    /** City - optional */
    city?: string

    /** Neighborhood - optional */
    neighborhood?: string

    /** State - optional */
    state?: string

    /** Latitude - optional */
    lat?: string

    /** Longitude - optional */
    long?: string
}



