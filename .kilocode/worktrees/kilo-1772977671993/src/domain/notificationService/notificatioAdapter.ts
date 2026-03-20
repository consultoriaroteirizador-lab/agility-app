import { GetBannerPromoResponse, GetBannerPromoResponseAPI } from "./dto/response/GetBannerPromoResponse";

function toGetBannerPromoResponse(response: GetBannerPromoResponseAPI): GetBannerPromoResponse {
    return {
        enabled: response.enabledBanner,
        imageUrl: response.imageUrl,
        linkUrl: response.linkUrl,
        linkTitle: response.linkTitle,
    }
}

export const notificationAdapter = {
    toGetBannerPromoResponse
}