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
    userStatusFromLogin?: string
): UserAuth {
    // Convert CollaboratorRole[] to string[]
    const roles = collaborator.roles.map(role => role.toString());

    // Use user_status from login response if available, otherwise map isActive boolean to status string
    let status: UserAuth['status'] = 'ACTIVE';
    if (userStatusFromLogin) {
        // Validate that userStatusFromLogin is a valid UserAuth status
        const validStatuses: UserAuth['status'][] = [
            'ACTIVE',
            'BLOCKED_BY_USER',
            'BLOCKED_BY_OVERTRYING',
            'CANCELED',
            'ACTIVE_WITH_TEMPORARY_PASSWORD'
        ];
        if (validStatuses.includes(userStatusFromLogin as UserAuth['status'])) {
            status = userStatusFromLogin as UserAuth['status'];
        } else {
            // Fallback to isActive if userStatusFromLogin is not a valid status
            status = collaborator.isActive ? 'ACTIVE' : 'BLOCKED_BY_USER';
        }
    } else {
        status = collaborator.isActive ? 'ACTIVE' : 'BLOCKED_BY_USER';
    }

    // Convert birthDate to string if it exists
    const birthdate = collaborator.birthDate 
        ? (typeof collaborator.birthDate === 'string' 
            ? collaborator.birthDate 
            : new Date(collaborator.birthDate).toISOString())
        : '';

    // Convert gender enum to string
    const gender = collaborator.gender || 'NOT_INFORMED';

    return {
        id: collaborator.keycloakUserId || collaborator.id,
        taxNumber: collaborator.taxNumber || '',
        email: collaborator.email || '', // Map email from CollaboratorResponse
        roles,
        fullname: collaborator.fullName || '',
        nickname: collaborator.nickname || '',
        gender,
        birthdate,
        familyName: collaborator.lastName || '',
        status,
        noDevice: false, // This field doesn't exist in CollaboratorResponse, using default
        phoneNumberVerified: !!collaborator.phone, // Using phone existence as verification indicator
        emailVerified: !!collaborator.email, // Using email existence as verification indicator
        driverId: collaborator.driverId || undefined, // ID do driver (já vem do profile)
    };
}