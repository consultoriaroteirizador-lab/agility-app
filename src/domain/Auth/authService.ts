import { apiAgility, apiIdentity } from "@/api";

import { BaseResponse } from "../../api/baseResponse";
import { baseResponseAdapter } from "../../api/baseResponseAdapter";

import { authAdapter } from "./authAdapter";
import { authApi } from "./authAPI";
import { AuthCredentials, AuthRequest, ChangePasswordRequest, ChangePasswordResponse, ForgotPasswordRequest, ForgotPasswordResponse } from "./authType";

async function signIn(request: AuthRequest): Promise<BaseResponse<AuthCredentials>> {
    const response = await authApi.login(request)
    const authType = authAdapter.toAuthResponse(response.result!)
    return baseResponseAdapter.toBaseResponse(response, authType) as BaseResponse<AuthCredentials>
}

async function refreshToken(refreshToken: string, username?: string): Promise<AuthCredentials> {
    const response = await authApi.refreshToken(refreshToken, username)
    
    // Se o refresh falhou, lançar erro
    if (!response.success || !response.result) {
        throw new Error(response.message || 'Token refresh failed')
    }
    
    return authAdapter.toAuthResponse(response.result)
}

function updateToken(token: string, tenantId?: string) {
    apiAgility.defaults.headers.common.Authorization = `Bearer ${token}`;
    apiIdentity.defaults.headers.common.Authorization = `Bearer ${token}`;
    
    if (tenantId) {
        apiAgility.defaults.headers.common['x-tenant-id'] = tenantId;
        apiIdentity.defaults.headers.common['x-tenant-id'] = tenantId;
    }
}

function removeToken() {
    apiAgility.defaults.headers.common.Authorization = null;
    apiIdentity.defaults.headers.common.Authorization = null;
    delete apiAgility.defaults.headers.common['x-tenant-id'];
    delete apiIdentity.defaults.headers.common['x-tenant-id'];
}

async function changePassword(request: ChangePasswordRequest): Promise<BaseResponse<ChangePasswordResponse>> {
    const response = await authApi.changePassword(request);
    return baseResponseAdapter.toBaseResponse(response, response.result!) as BaseResponse<ChangePasswordResponse>;
}

async function forgotPassword(request: ForgotPasswordRequest): Promise<BaseResponse<ForgotPasswordResponse>> {
    const response = await authApi.forgotPassword(request);
    return baseResponseAdapter.toBaseResponse(response, response.result!) as BaseResponse<ForgotPasswordResponse>;
}

export const authService = {
    signIn,
    updateToken,
    removeToken,
    refreshToken,
    changePassword,
    forgotPassword,

}