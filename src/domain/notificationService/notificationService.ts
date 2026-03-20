import { BaseResponse, baseResponseAdapter } from "@/api";

import { RegisterUserNotificationRequest } from "./dto/RegisterUserRequest";
import { RegisterUserServiceNotificationRequest } from "./dto/RegisterUserServiceRequest";
import { GetBannerPromoResponse } from "./dto/response/GetBannerPromoResponse";
import { notificationAdapter } from "./notificatioAdapter";
import { notificationAPI } from "./notificationAPI";


async function registerUser(request: RegisterUserNotificationRequest): Promise<BaseResponse<string>> {
    const response = await notificationAPI.registerUser(request);
    return baseResponseAdapter.toBaseResponse(response) as BaseResponse<string>;
}

async function registerUserService(request: RegisterUserServiceNotificationRequest): Promise<BaseResponse<string>> {
    const response = await notificationAPI.registerUserService(request);
    return baseResponseAdapter.toBaseResponse(response) as BaseResponse<string>;
}

async function getBannerPromo(): Promise<BaseResponse<GetBannerPromoResponse>> {
    const response = await notificationAPI.getBannerPromo();
    const objAdapter = notificationAdapter.toGetBannerPromoResponse(response.result!);
    return baseResponseAdapter.toBaseResponse(response, objAdapter) as BaseResponse<GetBannerPromoResponse>;
}


export const notificationService = {
    registerUserService,
    registerUser,
    getBannerPromo
};
