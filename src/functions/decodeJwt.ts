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
            throw new Error('Invalid token');
        }

        const payload = jwtDecode<TokenClaims>(token);

        if (!payload.sub) {
            // Só as CHAVES: o payload traz nome, e-mail e company_id do motorista,
            // e este log não tem portão de ambiente.
            console.error('Payload de JWT inválido - sem sub. Claims presentes:', Object.keys(payload));
            throw new Error('Invalid token payload structure');
        }

        return payload;
    } catch {
        // O `error` do jwt-decode ecoa o token recebido na mensagem — não logar.
        throw new Error('Invalid token');
    }
}
