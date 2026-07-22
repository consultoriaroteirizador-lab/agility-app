export function formatDatePtBr(date?: Date): string | undefined {
  if (!date) return undefined;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Meses começam do 0
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function getMonthYearFromDueDate(dueDateString: string): string {
  const date = new Date(dueDateString);

  if (isNaN(date.getTime())) {
    console.error("Data de vencimento inválida fornecida:", dueDateString);
    return "";
  }

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const monthIndex = date.getMonth();
  const year = date.getFullYear();

  const monthName = monthNames[monthIndex];

  return `${monthName}${"\n"}${year}`;
}

/** Fuso oficial da operação. O backend roda com TZ=America/Sao_Paulo. */
export const APP_TIMEZONE = 'America/Sao_Paulo';

/**
 * Formata um ISO/datetime para 'HH:mm' no fuso da operação
 * (America/Sao_Paulo), independentemente do fuso do aparelho. O backend emite
 * datetimes em UTC (ISO 'Z'); formatar no fuso do device fazia a ETA aparecer
 * deslocada em celulares com fuso/relógio divergente. Fallback para hora local
 * do device caso o runtime não tenha suporte a timeZone no Intl.
 * Retorna `fallback` quando o valor é nulo/ausente ou inválido.
 */
export function formatHHmm(value?: string | Date | null, fallback = '--:--'): string {
  if (!value) return fallback;
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return fallback;
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: APP_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  } catch {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
}

export function getLocalDateString(dateTimeString: string): string {
  return dateTimeString.split('T')[0];
}

/**
 * Interpreta um campo DATE-ONLY (dia-calendário, ex.: `routing.date`) e devolve a
 * MEIA-NOITE LOCAL desse dia — sem deslocar pelo fuso. O backend serializa
 * dia-calendário como meia-noite UTC (`'2026-07-22T00:00:00.000Z'`); ler isso com
 * getters locais em UTC-3 voltaria pro dia anterior. Por isso extraímos o Y-M-D:
 *  - string: prefixo `YYYY-MM-DD` (ignora hora/`Z`);
 *  - Date:   componentes em UTC (o valor é meia-noite UTC).
 *
 * NÃO use para INSTANTES reais (`startedAt`, `estimatedArrival`, `completedAt`) —
 * esses têm hora de verdade e devem ser exibidos no fuso da operação via
 * [formatHHmm]. Retorna `null` quando o valor é nulo/ausente ou inválido.
 */
export function parseCalendarDay(value?: string | Date | null): Date | null {
  if (!value) return null;
  if (typeof value === 'string') {
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0);
    const parsed = new Date(value);
    if (isNaN(parsed.getTime())) return null;
    return new Date(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 0, 0, 0, 0);
  }
  if (isNaN(value.getTime())) return null;
  return new Date(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 0, 0, 0, 0);
}

export function convertToDateObject(localDateString?: string | undefined): Date | undefined {
  if (!localDateString) {
    return undefined
  }
  const [year, month, day] = localDateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}