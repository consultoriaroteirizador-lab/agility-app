// Dias da semana para seleção de jornada
export type DiaSemana =
  | 'SEG'
  | 'TER'
  | 'QUA'
  | 'QUI'
  | 'SEX'
  | 'SAB'
  | 'DOM';

export const DIAS_SEMANA: DiaSemana[] = [
  'SEG',
  'TER',
  'QUA',
  'QUI',
  'SEX',
  'SAB',
  'DOM',
];

export const getDiaLabel = (dia: DiaSemana): string => {
  const labels: Record<DiaSemana, string> = {
    SEG: 'Segunda',
    TER: 'Terça',
    QUA: 'Quarta',
    QUI: 'Quinta',
    SEX: 'Sexta',
    SAB: 'Sábado',
    DOM: 'Domingo',
  };
  return labels[dia];
};

// Tipos de período de trabalho
export type PeriodoTrabalho =
  | 'CLT'
  | 'PJ'
  | 'ESTAGIO'
  | 'AUTONOMO';

export const PERIODOS_TRABALHO: PeriodoTrabalho[] = [
  { value: 'CLT', label: 'CLT' },
  { value: 'PJ', label: 'PJ' },
  { value: 'ESTAGIO', label: 'Estágio' },
  { value: 'AUTONOMO', label: 'Autônomo' },
];

// Tipo de horário de trabalho
export type TipoHorario = 'completo' | 'flexivel' | 'por_turno' | 'especifico';

export interface HorarioTrabalho {
  from: string; // "08:00"
  until: string; // "18:00"
}

export interface HorarioEspecifico {
  weekDay: DiaSemana;
  hours: HorarioTrabalho[];
}

// Intervalo de pausa
export interface IntervaloPausa {
  from: string; // "12:00"
  until: string; // "13:00"
}

export interface IntervaloPausaConfig {
  intervaloPausa?: string;
  intervaloDescanso?: string;
}

// Estrutura de jornada de trabalho
export interface JornadaTrabalho {
  id?: string;
  tipo?: PeriodoTrabalho;
  tipoHorario?: TipoHorario;
  workDays?: DiaSemana[]; // Dias trabalhados
  workPeriod?: PeriodoTrabalho[];
  specificHours?: HorarioEspecifico[];
  daysOff?: DiaSemana[]; // Dias de folga
  workStartTime?: string; // Horário de início geral
  workEndTime?: string; // Horário de fim geral
  intervaloPausa?: IntervaloPausaConfig;
  tempoConducaoContinua?: string; // Ex: "4h 30min"
  cargo?: string; // Ex: "Motorista"
  // Campos opcionais para integração futura
  maxHorasDiarias?: number;
  maxHorasSemanais?: number;
  ativo?: boolean;
}

// Tipos de turno (para horário por turno)
export interface TurnoTrabalho {
  id: string;
  nome: string;
  horarioInicio: string;
  horarioFim: string;
}

// DTOs para requests de API
export interface UpdateJornadaRequest {
  tipo?: PeriodoTrabalho;
  tipoHorario?: TipoHorario;
  workDays?: DiaSemana[];
  workStartTime?: string;
  workEndTime?: string;
  intervaloPausa?: string;
  intervaloDescanso?: string;
  specificHours?: HorarioEspecifico[];
  daysOff?: DiaSemana[];
}

// DTOs para responses de API
export interface JornadaResponse {
  id: string;
  tipo: PeriodoTrabalho;
  tipoHorario: TipoHorario;
  workDays: DiaSemana[];
  workPeriod?: PeriodoTrabalho[];
  specificHours?: HorarioEspecifico[];
  daysOff: DiaSemana[];
  workStartTime?: string;
  workEndTime?: string;
  intervaloPausa?: string;
  intervaloDescanso?: string;
  tempoConducaoContinua?: string;
  cargo?: string;
  maxHorasDiarias?: number;
  maxHorasSemanais?: number;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

// Estados para UI
export interface JornadaUIState {
  jornada: JornadaTrabalho;
  tabAtiva: 'configuracao' | 'calendario';
  saving: boolean;
  loading: boolean;
  error?: string;
}
