import { format, formatDistanceToNowStrict, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type DateInput = Date | string | null | undefined;

function toDate(value: DateInput): Date | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Data da rota em formato relativo + hora:
 *  - Hoje    → "Hoje, 14:30"
 *  - Amanhã  → "Amanhã, 08:00"
 *  - Outros  → "Sex, 22/07 · 09:00"
 */
export function formatRouteDate(value: DateInput): string | null {
    const date = toDate(value);
    if (!date) return null;

    const time = format(date, 'HH:mm');

    if (isToday(date)) return `Hoje, ${time}`;
    if (isTomorrow(date)) return `Amanhã, ${time}`;

    // No ptBR do date-fns, a forma curta de 3 letras é 'EEEEEE' ("qua", "sex");
    // 'EEE' devolve o nome cheio ("quarta").
    const weekday = capitalize(format(date, 'EEEEEE', { locale: ptBR }));
    return `${weekday}, ${format(date, 'dd/MM')} · ${time}`;
}

/** Tempo decorrido desde um instante: "há 25 min". null quando a data é inválida. */
export function formatRelativeSince(value: DateInput): string | null {
    const date = toDate(value);
    if (!date) return null;
    return formatDistanceToNowStrict(date, { addSuffix: true, locale: ptBR });
}

/** Duração legível: <60 → "45 min"; senão "1h20" / "2h" (sem minutos quebrados). */
export function formatDuration(minutes: number | null | undefined): string {
    if (!minutes || minutes <= 0) return '0 min';
    const total = Math.round(minutes);
    if (total < 60) return `${total} min`;
    const hours = Math.floor(total / 60);
    const mins = total % 60;
    return mins > 0 ? `${hours}h${String(mins).padStart(2, '0')}` : `${hours}h`;
}

/** Distância com 1 casa e vírgula decimal: "12,7 km". */
export function formatDistance(km: number | null | undefined): string {
    if (!km || km <= 0) return '0 km';
    return `${km.toFixed(1).replace('.', ',')} km`;
}

function groupThousands(intPart: string): string {
    return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Moeda BRL: "R$ 1.234,00". Retorna null quando 0/null para que a UI possa
 * esconder a pill em vez de mostrar "R$ 0,00".
 */
export function formatCurrency(value: number | null | undefined): string | null {
    if (!value) return null;
    const [int, dec] = Math.abs(value).toFixed(2).split('.');
    return `R$ ${groupThousands(int)},${dec}`;
}
