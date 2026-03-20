export type UserAuth = {
    id: string;
    taxNumber: string;
    email?: string; // Email address for login
    roles: string[];
    fullname: string;
    nickname: string;
    gender: string;
    birthdate: string;
    familyName: string;
    status: "ACTIVE" | "BLOCKED_BY_USER" | "BLOCKED_BY_OVERTRYING" | "CANCELED" | "ACTIVE_WITH_TEMPORARY_PASSWORD";
    noDevice: boolean;
    phoneNumberVerified: boolean;
    emailVerified: boolean;
    driverId?: string; // ID do driver (da tabela Driver) - já vem do profile
};


export type UserInfoTypeAPI = {
    id?: string | null;
    username?: string | null;
    taxNumber?: string | null;
    fullname?: string | null;
    email?: string | null;
    preferredUsername?: string | null;
    familyName?: string | null;
    birthdate?: string | null;
    gender?: 'MALE' | 'FEMALE' | 'OTHER' | null;
    nickname?: string | null;
    emailVerified?: boolean | null;
    phoneNumber?: string | null;
    phoneNumberVerified?: boolean | null;
    status?: "ACTIVE" | "BLOCKED_BY_USER" | "BLOCKED_BY_OVERTRYING" | "CANCELED" | null;
    roles?: string[] | null;
    noDevice?: boolean | null;
    exp?: number | null;
    sub?: string | null;
};

export type UserCredentials = {
    username: string;
    password?: string;
    name?: string,
    alias?: string;
    allowsBiometrics: boolean;
};