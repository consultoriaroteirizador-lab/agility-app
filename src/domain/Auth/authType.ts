export type AuthCredentialsAPI = {
    access_token: string;
    refresh_token?: string;
    token_type: string;
    expires_in: number;
    refresh_expires_in?: number;
    scope?: string;
    session_state: string;
    tenant_id?: string;
    user_status?: string;
}

export type AuthCredentials = {
    accessToken: string;
    refreshToken: string;
    expiration: string;
    expirationRefreshToken: string;
    scope: string;
    tenantId?: string;
    userStatus?: string;
    createdAt: string
}


export type AuthRequest = {
    emailOrUsername: string;
    password: string;
    tenantCode?: string;
}

export type ChangePasswordRequest = {
    currentPassword: string;
    newPassword: string;
    newPasswordConfirmation: string;
    emailOrUsername?: string; 
}

export type ChangePasswordResponse = {
    message: string;
    success: boolean;
}

export type ForgotPasswordRequest = {
    email: string;
    tenantCode?: string;
    companyId?: string;
    realm?: string;
    clientId?: string;
    redirectUri?: string;
}

export type ForgotPasswordResponse = {
    message: string;
    success: boolean;
}



