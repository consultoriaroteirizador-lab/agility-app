import { jwtDecode } from 'jwt-decode';

import { UserAuth } from '@/services/userAuthInfo/UserAuthInfoType';

export function decodeJWT(token: string): UserAuth {
    try {
        if (!token || token.trim() === '') {
            console.error('Token está vazio ou indefinido:', token);
            throw new Error('Invalid token');
        }

        const payload = jwtDecode<any>(token);

        if (
            !payload.sub ||
            !payload.taxNumber ||
            !payload.fullname ||
            !payload.nickname ||
            !payload.gender ||
            !payload.birthdate ||
            !payload.familyName ||
            !payload.status ||
            payload.noDevice === undefined ||
            payload.noDevice === null ||
            payload.emailVerified === undefined ||
            payload.emailVerified === null ||
            payload.phoneNumberVerified === undefined ||
            payload.phoneNumberVerified === null ||
            !Array.isArray(payload.roles) ||
            payload.roles.length === 0
        ) {
            console.error('Payload inválido:', payload);
            throw new Error('Invalid token payload structure');
        }

        return {
            id: payload.sub,
            taxNumber: payload.taxNumber,
            fullname: payload.fullname,
            nickname: payload.nickname,
            gender: payload.gender,
            birthdate: payload.birthdate,
            familyName: payload.familyName,
            status: payload.status,
            noDevice: payload.noDevice,
            emailVerified: payload.emailVerified,
            phoneNumberVerified: payload.phoneNumberVerified,
            roles: payload.roles,
        };
    } catch (error) {
        console.error('ERRO GERAL AO DECODIFICAR TOKEN:', error);
        throw new Error('Invalid token');
    }
}
