export type RoutingCategory = 'direct' | 'internal_auction' | 'public_auction';

export interface DefaultOffer {
    publicOffer: boolean;
    totalValue?: string;
    offerType?: 'proximity' | 'all';
    offerTime?: string; // HH:mm
}

export interface UserSettingsResponse {
    id: string;
    userId: string;
    routingCategory?: RoutingCategory;
    defaultOffer?: DefaultOffer;
    preferences?: Record<string, any>;
    createdAt: string;
    updatedAt: string;
}

