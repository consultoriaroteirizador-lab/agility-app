
import { apiIdentity } from "@/api";

import { BaseResponseAPI } from "./../../api/baseResponseAPI";
import { AuthCredentialsAPI, AuthRequest, ChangePasswordRequest, ChangePasswordResponse, ForgotPasswordRequest, ForgotPasswordResponse } from "./authType";
          

export async function login(
  request: AuthRequest
): Promise<BaseResponseAPI<AuthCredentialsAPI>> {

    const response = await apiIdentity.post<BaseResponseAPI<AuthCredentialsAPI>>(
      '/auth/login',
      request,
    );
    return response.data

}

const REFRESH_TOKEN_URL = '/auth/refresh-token';

export async function refreshToken(
  refreshToken: string,
  _username?: string
): Promise<BaseResponseAPI<AuthCredentialsAPI>> {

    const requestBody = {
      refresh_token: refreshToken,
      // Opcional: companyId, realm, clientId podem ser fornecidos se necessário
    };

    const response = await apiIdentity.post<BaseResponseAPI<AuthCredentialsAPI> >(
      REFRESH_TOKEN_URL,
      requestBody,
    );

    return response.data
}


async function changePassword(
  request: ChangePasswordRequest
): Promise<BaseResponseAPI<ChangePasswordResponse>> {
    const requestBody = {
      currentPassword: request.currentPassword,
      newPassword: request.newPassword,
      newPasswordConfirmation: request.newPasswordConfirmation,
      ...(request.emailOrUsername && { emailOrUsername: request.emailOrUsername }),
    };

    const response = await apiIdentity.post<ChangePasswordResponse>(
      '/auth/change-password',
      requestBody,
    );

    return response.data
}

async function forgotPassword(
  request: ForgotPasswordRequest
): Promise<BaseResponseAPI<ForgotPasswordResponse>> {
    const requestBody = {
      email: request.email,
      ...(request.tenantCode && { tenantCode: request.tenantCode }),
      ...(request.companyId && { companyId: request.companyId }),
      ...(request.realm && { realm: request.realm }),
      ...(request.clientId && { clientId: request.clientId }),
      ...(request.redirectUri && { redirectUri: request.redirectUri }),
    };

    const response = await apiIdentity.post<ForgotPasswordResponse>(
      '/auth/forgot-password',
      requestBody,
    );
    return response.data
}

export const authApi = {
  login,
  refreshToken,
  changePassword,
  forgotPassword,
  
};
