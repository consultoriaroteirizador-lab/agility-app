import { UserAuth } from '@/services/userAuthInfo/UserAuthInfoType';

import { CollaboratorResponse } from './dto';

/**
 * Maps CollaboratorResponse to UserAuth
 * This replaces the JWT decoding approach with a backend profile API call
 * @param collaborator - The collaborator data from backend
 * @param userStatusFromLogin - Optional user status from login response (takes precedence)
 */
export function mapCollaboratorToUserAuth(
    collaborator: CollaboratorResponse,
    userStatusFromLogin?: 'ACTIVE' | 'BLOCKED_BY_USER' | 'BLOCKED_BY_OVERTRYING' | 'CANCELED' | 'ACTIVE_WITH_TEMPORARY_PASSWORD'
): UserAuth {
    // Determine the most appropriate status
    let status: UserAuth['status'] = 'ACTIVE';

    if (userStatusFromLogin) {
        status = userStatusFromLogin;
    } else if (collaborator.isActive) {
        status = 'ACTIVE';
    }

    // Determine gender
    const gender = collaborator.gender || 'OTHER';

    // Format birthdate
    const birthdate = collaborator.birthDate
        ? typeof collaborator.birthDate === 'string'
            ? collaborator.birthDate
            : new Date(collaborator.birthDate).toISOString().split('T')[0]
        : '';

    // Extract roles as string array
    const roles = collaborator.roles?.map(r => typeof r === 'string' ? r : (r as any).name || '') || [];

    return {
        id: collaborator.keycloakUserId, // keycloakUserId (from JWT)
        taxNumber: collaborator.taxNumber || '',
        email: collaborator.email,
        roles,
        fullname: collaborator.fullName || '',
        nickname: collaborator.nickname || '',
        phone: collaborator.phone || '',
        gender,
        birthdate,
        familyName: collaborator.lastName || '',
        status,
        noDevice: false,
        phoneNumberVerified: !!collaborator.phone,
        emailVerified: !!collaborator.email,
        driverId: collaborator.driverId || undefined,
        collaboratorId: collaborator.id, // collaboratorId interno
    };
}
