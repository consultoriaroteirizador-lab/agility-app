/**
 * Enums and types shared between request and response DTOs
 */

export enum CollaboratorRole {
    ADMIN = 'ADMIN',
    MANAGER = 'MANAGER',
    SUPERVISOR = 'SUPERVISOR',
    USER = 'USER',
    DRIVER = 'DRIVER',
    SHIPPER = 'SHIPPER',
    HELPER = 'HELPER',
    SUPPORT = 'SUPPORT',
}

export enum Gender {
    MALE = 'MALE',
    FEMALE = 'FEMALE',
    OTHER = 'OTHER',
    NOT_INFORMED = 'NOT_INFORMED',
}

export interface WorkHourRange {
    from: string; // "09:00"
    until: string; // "18:00"
}

export interface SpecificWorkHours {
    weekDay: string; // "Seg", "Ter", etc.
    hours: WorkHourRange[];
}

export interface DayOff {
    startDate: string;
    endDate: string;
    title: string;
    status: 'offline' | 'vacation' | 'sick' | 'other';
}

export interface WorkSchedule {
    workDays: string[];
    workPeriod: string[];
    specificHours: boolean;
    specificWorkHours?: SpecificWorkHours[];
    daysOff?: DayOff[];
    // Novos campos para integração completa
    tipoContrato?: 'CLT' | 'PJ' | 'TRAINEE' | 'FREELANCER';
    breakInterval?: string;
    restInterval?: string;
}

