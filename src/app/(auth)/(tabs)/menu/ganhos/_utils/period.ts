// src/app/(auth)/(tabs)/menu/ganhos/_utils/period.ts
import { startOfDay, startOfMonth, startOfWeek, startOfYear } from 'date-fns';

export type Period = 'today' | 'week' | 'month' | 'year';

export const PERIODS: { value: Period; label: string }[] = [
    { value: 'today', label: 'Hoje' },
    { value: 'week', label: 'Semana' },
    { value: 'month', label: 'Mês' },
    { value: 'year', label: 'Ano' },
];

export function periodLabel(period: Period): string {
    return PERIODS.find((p) => p.value === period)?.label ?? 'Mês';
}

/** Início do período no fuso do aparelho (a operação é em SP). Semana começa na segunda. */
export function periodStart(period: Period, now: Date = new Date()): Date {
    switch (period) {
        case 'today':
            return startOfDay(now);
        case 'week':
            return startOfWeek(now, { weekStartsOn: 1 });
        case 'year':
            return startOfYear(now);
        case 'month':
        default:
            return startOfMonth(now);
    }
}

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function bucketOf(date: Date, period: Period): string {
    switch (period) {
        case 'today':
            return `${date.getHours()}h`;
        case 'week':
            return WEEK_DAYS[date.getDay()];
        case 'year':
            return MONTHS[date.getMonth()];
        case 'month':
        default:
            return String(date.getDate());
    }
}

function orderOf(label: string, period: Period): number {
    if (period === 'week') return WEEK_DAYS.indexOf(label);
    if (period === 'year') return MONTHS.indexOf(label);
    return parseInt(label, 10);
}

export interface ChartData {
    labels: string[];
    datasets: { data: number[] }[];
}

/**
 * Dados do `EarningsChart`, que formata em REAIS: é o único ponto do app que converte
 * centavos → reais à mão.
 */
export function chartDataFor(items: readonly { releasedAt: string; releasedCents: number }[], period: Period): ChartData {
    const cents: Record<string, number> = {};
    for (const item of items) {
        const key = bucketOf(new Date(item.releasedAt), period);
        cents[key] = (cents[key] ?? 0) + item.releasedCents;
    }
    const labels = Object.keys(cents).sort((a, b) => orderOf(a, period) - orderOf(b, period));
    if (labels.length === 0) return { labels: ['Sem dados'], datasets: [{ data: [0] }] };
    return { labels, datasets: [{ data: labels.map((label) => cents[label] / 100) }] };
}
