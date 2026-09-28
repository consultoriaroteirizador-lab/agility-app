import type { AdvanceResponse } from '@/domain/agility/wallet/dto/response/wallet.response';
import { formatDateOnly } from '@/utils/formatDate';

/**
 * A dívida de cobrança em dinheiro nasce com a descrição
 * "Dinheiro recebido no service <uuid> — devolução pendente" (back, payment.listener.ts:99).
 * O id não vai para a tela (regra "nome, nunca id").
 */
const CASH_DEBT_PREFIX = /^Dinheiro recebido no service /;

export function advanceTitle(a: Pick<AdvanceResponse, 'description'>): string {
    if (CASH_DEBT_PREFIX.test(a.description ?? '')) return 'Dinheiro recebido de cliente';
    return a.description;
}

/**
 * Formata a hora local (device) de um instante real (`new Date`, sem o parse de
 * dia-calendário — que IGNORA a hora e chuta o dia certo só quando ela é meia-noite UTC).
 */
function formatLocalDateOnly(value: string): string {
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

/**
 * `dueDate` só é dia-calendário (R12, meia-noite UTC do dia escolhido pelo painel) quando a
 * hora É EXATAMENTE `T00:00:00.000Z` — é o único caso em que `formatDateOnly`
 * (`parseCalendarDay`) é seguro: ele IGNORA a hora do valor e chuta o dia a partir só dos
 * dígitos `YYYY-MM-DD`, então um instante real (não meia-noite) devolvia o dia UTC errado
 * para quem está a oeste do meridiano. Fora desse caso é timestamp de verdade — formata no
 * fuso do device.
 */
function formatDueDay(dueDate: string): string {
    const isCalendarDayMidnightUTC = /T00:00:00\.000Z$/.test(dueDate);
    return isCalendarDayMidnightUTC ? formatDateOnly(dueDate) : formatLocalDateOnly(dueDate);
}

export function advanceDueText(a: Pick<AdvanceResponse, 'dueDate'>): string | null {
    if (!a.dueDate) return null;
    const dia = formatDueDay(a.dueDate);
    return dia ? `Vence em ${dia}` : null;
}

/**
 * Mesmo dia de `advanceDueText`, prefixo de vencido. "Venceu em <data>" — antes era
 * "Vencido — vence em <data>", que repetia "vence" e lia estranho.
 */
export function advanceOverdueText(a: Pick<AdvanceResponse, 'dueDate'>): string | null {
    if (!a.dueDate) return null;
    const dia = formatDueDay(a.dueDate);
    return dia ? `Venceu em ${dia}` : null;
}
