/**
 * Types for Journey/Work Schedule integration
 * Aligned with backend DriverEntity and WorkSchedule patterns
 */

// ─── Week Days (Backend uses 3-letter English abbreviations) ───────────────────

export type WeekDay = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN'

export const WEEK_DAYS: WeekDay[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

export const getWeekDayLabel = (day: WeekDay): string => {
  const labels: Record<WeekDay, string> = {
    MON: 'Segunda',
    TUE: 'Terça',
    WED: 'Quarta',
    THU: 'Quinta',
    FRI: 'Sexta',
    SAT: 'Sábado',
    SUN: 'Domingo',
  }
  return labels[day]
}

// Legacy mapping for backwards compatibility
export type DiaSemana = WeekDay
export const DIAS_SEMANA = WEEK_DAYS
export const getDiaLabel = getWeekDayLabel

// ─── Work Period Types ──────────────────────────────────────────────────────────

export type WorkPeriod = 'CLT' | 'PJ' | 'TRAINEE' | 'FREELANCER'

export interface WorkPeriodOption {
  value: WorkPeriod
  label: string
}

export const WORK_PERIOD_OPTIONS: WorkPeriodOption[] = [
  { value: 'CLT', label: 'CLT' },
  { value: 'PJ', label: 'PJ' },
  { value: 'TRAINEE', label: 'Estágio' },
  { value: 'FREELANCER', label: 'Autônomo' },
]

// Legacy types
export type PeriodoTrabalho = WorkPeriod
export const PERIODOS_TRABALHO = WORK_PERIOD_OPTIONS

// ─── Schedule Type ──────────────────────────────────────────────────────────────

export type ScheduleType = 'full' | 'flexible' | 'shift' | 'specific'

export interface ScheduleTypeOption {
  value: ScheduleType
  label: string
}

export const SCHEDULE_TYPE_OPTIONS: ScheduleTypeOption[] = [
  { value: 'full', label: 'Horário Completo' },
  { value: 'flexible', label: 'Horário Flexível' },
  { value: 'shift', label: 'Por Turno' },
  { value: 'specific', label: 'Horários Específicos' },
]

// Legacy types
export type TipoHorario = ScheduleType

// ─── Work Hours Types ───────────────────────────────────────────────────────────

export interface WorkHourRange {
  from: string // "08:00"
  until: string // "18:00"
}

export interface SpecificWorkHours {
  weekDay: WeekDay
  hours: WorkHourRange[]
}

export interface DayOff {
  startDate: string
  endDate: string
  title: string
  status: 'offline' | 'vacation' | 'sick' | 'other'
}

export interface BreakConfig {
  breakInterval?: string
  restInterval?: string
}

// Legacy types
export type HorarioTrabalho = WorkHourRange
export type HorarioEspecifico = SpecificWorkHours
export type IntervaloPausa = WorkHourRange
export type IntervaloPausaConfig = BreakConfig

// ─── Main Work Schedule Interface (aligned with backend) ────────────────────────

/**
 * Work schedule configuration aligned with backend WorkSchedule interface
 */
export interface WorkSchedule {
  workDays: WeekDay[]
  workPeriod: WorkPeriod[]
  specificHours: boolean
  specificWorkHours?: SpecificWorkHours[]
  daysOff?: DayOff[]
  // Novos campos para integração completa
  breakInterval?: string    // "01:00" - intervalo de almoço
  restInterval?: string     // "00:15" - intervalo de descanso
  tipoContrato?: WorkPeriod // CLT, PJ, TRAINEE, FREELANCER
}

/**
 * Driver work schedule fields (from DriverEntity)
 * These are the fields that can be updated via PATCH /drivers/:id
 */
export interface DriverWorkSchedule {
  workDays: string // Comma-separated: "MON,TUE,WED,THU,FRI"
  workStartTime: string // "08:00"
  workEndTime: string | null // "18:00"
}

// ─── Request/Response DTOs ──────────────────────────────────────────────────────

/**
 * Request DTO for updating driver work schedule
 * Maps to UpdateDriverDto from backend
 */
export interface UpdateWorkScheduleRequest {
  workDays?: WeekDay[]
  workStartTime?: string
  workEndTime?: string
  breakInterval?: string
  restInterval?: string
  specificWorkHours?: SpecificWorkHours[]
  daysOff?: string[] // Datas de folga no formato "YYYY-MM-DD"
  tipoContrato?: WorkPeriod // CLT, PJ, TRAINEE, FREELANCER
}

/**
 * Response DTO for work schedule
 * Maps to DriverEntity.toJson() from backend
 */
export interface WorkScheduleResponse {
  id: string
  workDays: string // Comma-separated from backend
  workStartTime: string
  workEndTime: string | null
  specificWorkHours?: SpecificWorkHours[]
  daysOff?: string // Comma-separated from backend
  daysOffArray?: DayOff[] // Array de dias de folga com detalhes
  breakInterval?: string
  restInterval?: string
  tipoContrato?: WorkPeriod // CLT, PJ, TRAINEE, FREELANCER
  maxDrivingHours?: string // "4h 30min"
  role?: string
  maxDailyHours?: number
  maxWeeklyHours?: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Legacy types for backwards compatibility
export interface JornadaTrabalho {
  id?: string
  tipo?: WorkPeriod
  tipoHorario?: ScheduleType
  workDays?: WeekDay[]
  workPeriod?: WorkPeriod[]
  specificHours?: SpecificWorkHours[]
  daysOff?: string[] // Datas de folga no formato "YYYY-MM-DD"
  daysOffArray?: DayOff[] // Array de dias de folga com detalhes
  workStartTime?: string
  workEndTime?: string
  intervaloPausa?: BreakConfig
  tempoConducaoContinua?: string
  cargo?: string
  maxHorasDiarias?: number
  maxHorasSemanais?: number
  ativo?: boolean
}

export type UpdateJornadaRequest = UpdateWorkScheduleRequest
export type JornadaResponse = WorkScheduleResponse

// ─── UI State Types ─────────────────────────────────────────────────────────────

export interface WorkScheduleUIState {
  schedule: WorkSchedule
  activeTab: 'configuration' | 'calendar'
  saving: boolean
  loading: boolean
  error?: string
}

// Legacy type
export type JornadaUIState = WorkScheduleUIState

// ─── Utility Functions ──────────────────────────────────────────────────────────

/**
 * Convert WeekDay array to comma-separated string for backend
 */
export const formatWorkDaysForBackend = (days: WeekDay[]): string => {
  return days.join(',')
}

/**
 * Parse comma-separated work days string from backend to WeekDay array
 */
export const parseWorkDaysFromBackend = (days: string): WeekDay[] => {
  if (!days) return []
  return days.split(',').filter((d): d is WeekDay => WEEK_DAYS.includes(d as WeekDay))
}

/**
 * Check if a day is a work day
 */
export const isWorkDay = (day: WeekDay, workDays: WeekDay[]): boolean => {
  return workDays.includes(day)
}
