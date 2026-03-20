import type {
    CollaboratorRole,
    Gender,
    WorkSchedule,
} from '../types'

/**
 * DTO for creating a new collaborator
 * Maps to CreateCollaboratorDto from backend
 */
export interface CreateCollaboratorRequest {
    /** Email address - required */
    email: string;

    /** Password (min 6 characters) - required */
    password: string;

    /** Is temporary password - optional, default false */
    temporaryPassword?: boolean;

    /** First name - required */
    firstName: string;

    /** Last name - required */
    lastName: string;

    /** Nickname/Apelido - optional */
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

    /** Hire date - optional */
    hireDate?: Date | string;

    /** Collaborator roles (can have multiple) - optional */
    roles?: CollaboratorRole[];

    /** Skills - optional */
    skills?: string[];

    /** Address ID - optional */
    addressId?: string;

    /** Fixed Vehicle ID - optional */
    fixedVehicleId?: string;

    /** Work schedule configuration - optional */
    workSchedule?: WorkSchedule;

    /** Helper IDs (for drivers with fixed helpers) - optional */
    helperIds?: string[];

    /** Custom fields (JSON object) - optional */
    customFields?: Record<string, any>;

    /** Driver data (required if roles include DRIVER) - optional */
    driverData?: DriverDataRequest;
}

/**
 * Driver data for creating a driver when collaborator has DRIVER role
 */
export interface DriverDataRequest {
    /** License number (CNH) - required */
    licenseNumber: string;

    /** License category - required */
    licenseCategory: string;

    /** License expiry date - optional */
    licenseExpiry?: string;

    /** Work days (comma-separated) - required */
    workDays: string;

    /** Work start time - required */
    workStartTime: string;

    /** Work end time - optional */
    workEndTime?: string;

    /** Team code - optional */
    teamCode?: string;

    /** Supervisor name or ID - optional */
    supervisor?: string;

    /** Cost center - optional */
    costCenter?: string;

    /** Start latitude - optional */
    startLatitude?: number;

    /** Start longitude - optional */
    startLongitude?: number;

    /** Start city - optional */
    startCity?: string;

    /** Notes - optional */
    notes?: string;

    /** Skills for ORS optimization (array of numbers) - optional */
    skills?: number[];

    /** Time window start in seconds since midnight - optional */
    timeWindowStart?: number;

    /** Time window end in seconds since midnight - optional */
    timeWindowEnd?: number;

    /** Maximum stops per day - optional */
    maxStops?: number;
}

