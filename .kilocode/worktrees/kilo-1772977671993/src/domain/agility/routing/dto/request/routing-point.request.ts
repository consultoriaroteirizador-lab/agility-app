/**
 * DTO for routing point (origin or return)
 */
export interface RoutingPointRequest {
    /** Latitude - optional, range -90 to 90 */
    latitude?: number

    /** Longitude - optional, range -180 to 180 */
    longitude?: number

    /** Address description - optional */
    address?: string

    /** Address ID (if using existing address) - optional */
    addressId?: string
}



