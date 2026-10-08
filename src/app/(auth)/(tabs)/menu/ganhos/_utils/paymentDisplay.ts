// src/app/(auth)/(tabs)/menu/ganhos/_utils/paymentDisplay.ts
import type { PaymentResponse } from '@/domain/agility/finance/dto/response/payment.response';
import type { StatusColorConfig } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';

import { advanceDueText, advanceOverdueText } from '../../carteira/_utils/advanceDisplay';

const STATUS: Record<string, StatusColorConfig> = {
    APPROVED: { label: 'Recebido', textColor: 'tertiary100', bgColor: 'tertiary20' },
    PENDING: { label: 'Pendente', textColor: 'yellow100', bgColor: 'yellow20' },
    REJECTED: { label: 'Recusado', textColor: 'gray400', bgColor: 'gray50' },
};

const CANCELLED: StatusColorConfig = { label: 'Cancelado', textColor: 'gray400', bgColor: 'gray50' };

const METHOD_LABELS: Record<string, string> = {
    CASH: 'Dinheiro',
    PIX: 'PIX',
    CARD_DEBIT: 'Cartão de débito',
    CARD_CREDIT: 'Cartão de crédito',
};

type P = Pick<
    PaymentResponse,
    | 'customerName' | 'serviceTitle' | 'routingCode' | 'routingName' | 'expectedValue' | 'receivedValue' | 'status' | 'createdAt'
    | 'paymentMethod' | 'cancelledAt' | 'cancelReason' | 'debt'
>;

export interface PaymentDisplay {
    title: string;
    subtitle: string | null;
    /** Nome ou código da rota. Nunca o id (regra "nome, nunca id"). */
    route: string | null;
    status: StatusColorConfig;
    amountCents: number;
    date: string;
    /** "Dinheiro", "PIX"... `null` sem a forma (pendente, cobrança antiga). */
    method: string | null;
    /** "Cancelado pela empresa: <motivo>" (UC15). */
    cancelText: string | null;
    /** Situação da dívida do dinheiro vivo (F6). `null` = o back não ligou dívida: não afirma nada (R4). */
    debt: { text: string; overdue: boolean } | null;
}

function debtLine(debt: P['debt']): PaymentDisplay['debt'] {
    if (!debt) return null;
    if (debt.status === 'RETURNED') return { text: 'Devolvido à empresa', overdue: false };
    if (debt.status === 'CANCELLED') return { text: 'Devolução cancelada pela empresa', overdue: false };
    const dueDate = debt.dueDate ?? undefined;
    const prazo = debt.isOverdue ? advanceOverdueText({ dueDate }) : advanceDueText({ dueDate });
    const valor = `A devolver: ${formatCurrency(debt.pendingAmountCents)}`;
    return { text: prazo ? `${valor} · ${prazo}` : valor, overdue: debt.isOverdue };
}

export function describePayment(p: P): PaymentDisplay {
    const cancelled = p.status === 'REJECTED' && !!p.cancelledAt;
    const motivo = p.cancelReason?.trim();
    return {
        title: p.customerName || 'Cliente',
        subtitle: p.serviceTitle ?? null,
        route: p.routingName || p.routingCode || null,
        status: cancelled ? CANCELLED : (STATUS[p.status] ?? STATUS.PENDING),
        amountCents: p.receivedValue ?? p.expectedValue,
        // SEMPRE `createdAt`, nunca `paymentDate`: `GET /finance/payments` filtra o período
        // por `createdAt` (`finance.controller.ts`, back). Mostrar `paymentDate` podia listar
        // uma data fora do período que o motorista escolheu — a mesma cobrança pareceria ter
        // "vazado" do filtro de Hoje/Semana/Mês/Ano.
        date: p.createdAt,
        method: (p.paymentMethod && METHOD_LABELS[p.paymentMethod]) || null,
        cancelText: cancelled ? (motivo ? `Cancelado pela empresa: ${motivo}` : 'Cancelado pela empresa.') : null,
        debt: debtLine(p.debt),
    };
}

export type DebtCard =
    | { kind: 'error' }
    | { kind: 'loading' }
    | { kind: 'none' }
    | { kind: 'debt'; totalCents: number; count: number; overdueCount: number };

/**
 * Cartão "Dinheiro a devolver". Erro sem dado é ERRO, nunca "nada a devolver" (a tela
 * antiga de adiantamentos dizia ✓ "nenhum pendente" com a API fora — auditoria, Bug 9).
 */
export function debtCardState(
    summary: { totalPending: number; count: number; overdueCount: number } | undefined,
    isError: boolean,
): DebtCard {
    if (!summary) return isError ? { kind: 'error' } : { kind: 'loading' };
    if (summary.totalPending <= 0) return { kind: 'none' };
    return { kind: 'debt', totalCents: summary.totalPending, count: summary.count, overdueCount: summary.overdueCount };
}
