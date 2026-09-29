// src/app/(auth)/(tabs)/menu/ganhos/_utils/paymentDisplay.ts
import type { PaymentResponse } from '@/domain/agility/finance/dto/response/payment.response';
import type { StatusColorConfig } from '@/theme';

const STATUS: Record<string, StatusColorConfig> = {
    APPROVED: { label: 'Recebido', textColor: 'tertiary100', bgColor: 'tertiary20' },
    PENDING: { label: 'Pendente', textColor: 'yellow100', bgColor: 'yellow20' },
    REJECTED: { label: 'Recusado', textColor: 'gray400', bgColor: 'gray50' },
};

type P = Pick<
    PaymentResponse,
    'customerName' | 'serviceTitle' | 'routingCode' | 'routingName' | 'expectedValue' | 'receivedValue' | 'status' | 'createdAt'
>;

export interface PaymentDisplay {
    title: string;
    subtitle: string | null;
    /** Nome ou código da rota. Nunca o id (regra "nome, nunca id"). */
    route: string | null;
    status: StatusColorConfig;
    amountCents: number;
    date: string;
}

export function describePayment(p: P): PaymentDisplay {
    return {
        title: p.customerName || 'Cliente',
        subtitle: p.serviceTitle ?? null,
        route: p.routingName || p.routingCode || null,
        status: STATUS[p.status] ?? STATUS.PENDING,
        amountCents: p.receivedValue ?? p.expectedValue,
        // SEMPRE `createdAt`, nunca `paymentDate`: `GET /finance/payments` filtra o período
        // por `createdAt` (`finance.controller.ts`, back). Mostrar `paymentDate` podia listar
        // uma data fora do período que o motorista escolheu — a mesma cobrança pareceria ter
        // "vazado" do filtro de Hoje/Semana/Mês/Ano.
        date: p.createdAt,
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
