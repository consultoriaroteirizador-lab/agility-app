import { AuthCredentials, AuthCredentialsAPI } from "./authType";


function toAuthCredentials(
    authCredentialsAPI: AuthCredentialsAPI,
    createdAt: Date = new Date()
  ): AuthCredentials {
    const expirationDate = new Date(createdAt.getTime() + (authCredentialsAPI.expires_in * 1000));
    const refreshExpirationDate = authCredentialsAPI.refresh_expires_in
      ? new Date(createdAt.getTime() + (authCredentialsAPI.refresh_expires_in * 1000))
      : new Date(createdAt.getTime() + (30 * 24 * 60 * 60 * 1000));
  
    return {
      accessToken: authCredentialsAPI.access_token,
      refreshToken: authCredentialsAPI.refresh_token || '',
      expiration: expirationDate.toISOString(),
      expirationRefreshToken: refreshExpirationDate.toISOString(),
      createdAt: createdAt.toISOString(),
      scope: authCredentialsAPI.scope || '',
      tenantId: authCredentialsAPI.tenant_id,
      userStatus: authCredentialsAPI.user_status,
    };
  }

export const authAdapter = {
    toAuthResponse: toAuthCredentials
}