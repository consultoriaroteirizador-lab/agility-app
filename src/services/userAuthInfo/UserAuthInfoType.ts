export type UserAuth = {
    id: string;
    email?: string;
    fullname: string;
    familyName?: string;
    roles: string[];
    status: "ACTIVE" | "BLOCKED_BY_USER" | "BLOCKED_BY_OVERTRYING" | "CANCELED" | "ACTIVE_WITH_TEMPORARY_PASSWORD";
    driverId?: string; // ID do driver (da tabela Driver) - vem do JWT claim driver_id
    collaboratorId?: string; // ID do collaborator (da tabela Collaborator) - vem do JWT claim collaborator_id
    companyId?: string; // ID da empresa/tenant - vem do JWT claim company_id
    // Campos opcionais - preenchidos sob demanda via GET /collaborators/profile
    taxNumber?: string;
    nickname?: string;
    phone?: string;
    gender?: string;
    birthdate?: string;
    noDevice?: boolean;
    phoneNumberVerified?: boolean;
    emailVerified?: boolean;
    employeeCode?: string;
    department?: string;
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
