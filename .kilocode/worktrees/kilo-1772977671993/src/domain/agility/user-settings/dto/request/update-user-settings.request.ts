import type { RoutingCategory, DefaultOffer } from '../response/user-settings.response';

export interface UpdateUserSettingsRequest {
    routingCategory?: RoutingCategory;
    defaultOffer?: DefaultOffer;
    preferences?: Record<string, any>;
}

