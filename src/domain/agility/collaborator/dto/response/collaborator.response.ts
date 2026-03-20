import type {
    CollaboratorRole,
    Gender,
    WorkSchedule,
} from '../types'

/**
 * Collaborator response DTO
 * Maps to CollaboratorEntity.toJson() from backend
 */
export interface CollaboratorResponse {
    /** Collaborator unique identifier */
    id: string;

    /** Keycloak user ID */
    keycloakUserId: string;

    /** Email address */
    email: string;

    /** First name */
    firstName: string | null;

    /** Last name */
    lastName: string | null;

    /** Nickname/Apelido */
    nickname: string | null;

    /** Full name (firstName + lastName) */
    fullName: string | null;

    /** Display name (nickname or fullName) */
    displayName: string | null;

    /** Phone number */
    phone: string | null;

    /** CPF (Tax Number) */
    taxNumber: string | null;

    /** Gender */
    gender: Gender | null;

    /** Birth date */
    birthDate: Date | string | null;

    /** Age (calculated from birthDate) */
    age: number | null;

    /** Department */
    department: string | null;

    /** Position/Job title */
    position: string | null;

    /** Employee code */
    employeeCode: string | null;

    /** Manager ID */
    managerId: string | null;

    /** Hire date */
    hireDate: Date | string | null;

    /** Collaborator roles */
    roles: CollaboratorRole[];

    /** Skills */
    skills: string[] | null;

    /** Address ID */
    addressId: string | null;

    /** Fixed Vehicle ID */
    fixedVehicleId: string | null;

    /** Work schedule configuration */
    workSchedule: WorkSchedule | null;

    /** Driver ID (if is a helper) */
    driverId: string | null;

    /** Custom fields */
    customFields: Record<string, any> | null;

    /** Is active */
    isActive: boolean;

    /** Is driver */
    isDriver: boolean;

    /** Is helper */
    isHelper: boolean;

    /** Is admin */
    isAdmin: boolean;

    /** Is manager */
    isManager: boolean;

    /** Is supervisor */
    isSupervisor: boolean;

    /** Is shipper */
    isShipper: boolean;

    /** Is support */
    isSupport: boolean;

    /** Has manager */
    hasManager: boolean;

    /** Has fixed vehicle */
    hasFixedVehicle: boolean;

    /** Work schedule configuration */
    workSchedule?: WorkSchedule;

    /** Creation timestamp */
    createdAt: Date | string;

    /** Last update timestamp */
    updatedAt: Date | string;
}

