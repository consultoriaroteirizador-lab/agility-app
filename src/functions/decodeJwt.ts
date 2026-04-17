import { jwtDecode } from 'jwt-decode';

export type TokenClaims = {
    sub: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    given_name?: string;
    family_name?: string;
    preferred_username?: string;
    company_id?: string;
    collaborator_id?: string;
    driver_id?: string;
    employee_code?: string;
    department?: string;
    realm_access?: { roles: string[] };
    resource_access?: Record<string, { roles: string[] }>;
    exp?: number;
    iat?: number;
    iss?: string;
};

export function decodeJWT(token: string): TokenClaims {
    try {
        if (!token || token.trim() === '') {
            console.error('Token está vazio ou indefinido:', token);
            throw new Error('Invalid token');
        }

        const payload = jwtDecode<TokenClaims>(token);

        if (!payload.sub) {
            console.error('Payload inválido - sem sub:', payload);
            throw new Error('Invalid token payload structure');
        }

        return payload;
    } catch (error) {
        console.error('ERRO GERAL AO DECODIFICAR TOKEN:', error);
        throw new Error('Invalid token');
    }
}
