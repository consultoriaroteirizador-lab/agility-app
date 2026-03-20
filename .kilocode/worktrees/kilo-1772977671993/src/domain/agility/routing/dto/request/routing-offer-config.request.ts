import type { OfferType } from '../types'

/**
 * DTO for routing offer configuration
 */
export interface RoutingOfferConfigRequest {
    /** Is public offer (broadcast) - optional, default: false */
    publicOffer?: boolean

    /** Offer type - optional */
    offerType?: OfferType

    /** Offer time limit (HH:mm) - optional */
    offerTime?: string

    /** Total value - optional */
    totalValue?: number

    /** Broadcast radius in km - optional, minimum 0 */
    broadcastRadiusKm?: number
}



