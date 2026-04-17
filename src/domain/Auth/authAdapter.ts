import { TokenClaims } from "@/functions/decodeJwt";
import { UserAuth } from "@/services/userAuthInfo/UserAuthInfoType";

import { AuthCredentials, AuthCredentialsAPI } from "./authType";


function toAuthCredentials(
  authCredentialsAPI: AuthCredentialsAPI,
  createdAt: Date = new Date()
): AuthCredentials {
  const expirationDate = new Date(createdAt.getTime() + (authCredentialsAPI.expires_in * 1000));
  const refreshExpirationDate = authCredentialsAPI.refresh_expires_in
    ? new Date(createdAt.getTime() + (authCredentialsAPI.refresh_expires_in * 1000))
    : new Date(createdAt.getTime() + (30 * 24 * 60 * 60 * 1000));

  console.log('[authAdapter] API response tenant_id:', authCredentialsAPI.tenant_id);
  console.log('[authAdapter] API response user_status:', authCredentialsAPI.user_status);

  const credentials: AuthCredentials = {
    accessToken: authCredentialsAPI.access_token,
    refreshToken: authCredentialsAPI.refresh_token || '',
    expiration: expirationDate.toISOString(),
    expirationRefreshToken: refreshExpirationDate.toISOString(),
    createdAt: createdAt.toISOString(),
    scope: authCredentialsAPI.scope || '',
    tenantId: authCredentialsAPI.tenant_id,
    userStatus: authCredentialsAPI.user_status,
  };

  console.log('[authAdapter] Mapped credentials tenantId:', credentials.tenantId);

  return credentials;
}

/**
 * Maps JWT token claims to UserAuth
 * Uses the new Keycloak custom claims (company_id, collaborator_id, driver_id)
 * instead of fetching from GET /collaborators/profile
 */
function mapTokenClaimsToUserAuth(
  claims: TokenClaims,
  userStatus?: string
): UserAuth {
  const roles = claims.realm_access?.roles ?? [];

  return {
    id: claims.sub,
    email: claims.email,
    fullname: claims.name || '',
    familyName: claims.family_name,
    roles,
    status: (userStatus as UserAuth['status']) || 'ACTIVE',
    driverId: claims.driver_id || undefined,
    collaboratorId: claims.collaborator_id || undefined,
    companyId: claims.company_id || undefined,
    employeeCode: claims.employee_code || undefined,
    department: claims.department || undefined,
    emailVerified: claims.email_verified,
  };
}

export const authAdapter = {
  toAuthResponse: toAuthCredentials,
  mapTokenClaimsToUserAuth
}
