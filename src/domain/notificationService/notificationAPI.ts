import { apiIdentity, BaseResponseAPI } from "@/api";

import { RegisterUserNotificationRequest } from "./dto/RegisterUserRequest";
import { RegisterUserServiceNotificationRequest } from "./dto/RegisterUserServiceRequest";
import { GetBannerPromoResponseAPI } from "./dto/response/GetBannerPromoResponse";



async function registerUser(request: RegisterUserNotificationRequest): Promise<BaseResponseAPI<string>> {
    const response = await apiIdentity.post<BaseResponseAPI<string>>("/app/user/register", request);
    return response.data;
}

async function registerUserService(request: RegisterUserServiceNotificationRequest): Promise<BaseResponseAPI<string>> {
    const response = await apiIdentity.post<BaseResponseAPI<string>>("/app/userService/register", request);
    return response.data;
}

async function getBannerPromo(): Promise<BaseResponseAPI<GetBannerPromoResponseAPI>> {
    const response = await apiIdentity.get<BaseResponseAPI<GetBannerPromoResponseAPI>>("/app/marketing/getBannerPromo");
    return response.data;
}


export const notificationAPI = {
    registerUser,
    registerUserService,
    getBannerPromo

};
