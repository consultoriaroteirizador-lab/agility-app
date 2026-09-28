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

/** Dia-calendário (R12): o painel grava o vencimento como meia-noite UTC do dia escolhido. */
export function advanceDueText(a: Pick<AdvanceResponse, 'dueDate'>): string | null {
    if (!a.dueDate) return null;
    const dia = formatDateOnly(a.dueDate);
    return dia ? `Vence em ${dia}` : null;
}
