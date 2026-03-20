import type {
    CollaboratorRole,
    Gender,
    WorkSchedule,
} from '../types'

/**
 * DTO for updating a collaborator
 * Maps to UpdateCollaboratorDto from backend
 * All fields are optional for PATCH operations
 */
export interface UpdateCollaboratorRequest {
    /** First name - optional */
    firstName?: string;

    /** Last name - optional */
    lastName?: string;

    /** Nickname - optional */
    nickname?: string;

    /** Phone number - optional */
    phone?: string;

    /** CPF (Tax Number) - optional */
    taxNumber?: string;

    /** Gender - optional */
    gender?: Gender;

    /** Birth date - optional */
    birthDate?: Date | string;

    /** Department - optional */
    department?: string;

    /** Position/Job title - optional */
    position?: string;

    /** Employee code - optional */
    employeeCode?: string;

    /** Manager ID - optional */
    managerId?: string;

    /** Collaborator roles - optional */
    roles?: CollaboratorRole[];

    /** Skills - optional */
    skills?: string[];

    /** Address ID - optional */
    addressId?: string;

    /** Fixed Vehicle ID - optional */
    fixedVehicleId?: string;

    /** Work schedule configuration - optional */
    workSchedule?: WorkSchedule;

    /** Helper IDs - optional */
    helperIds?: string[];

    /** Custom fields (JSON object) - optional */
    customFields?: Record<string, any>;
}

