import { mensagemDaApi } from '@/api/apiErrorMessage';
import type { WithdrawalAllowance } from '@/domain/agility/wallet/withdrawalAllowance';
import { formatCurrency } from '@/utils/formatCurrency';

export interface PolicyNotice {
    /** `block`: não dá para sacar agora; `limit`: há teto; `info`: a regra vale, mas não trava hoje. */
    tone: 'block' | 'limit' | 'info';
    text: string;
}

/** Cor do aviso da política: bloqueio é erro; teto e informação são aviso. Única fonte (Tasks 6 e 8). */
export function policyNoticeColor(tone: PolicyNotice['tone']): 'colorTextError' | 'colorTextWarning' {
    return tone === 'block' ? 'colorTextError' : 'colorTextWarning';
}

/**
 * O que a política de saque com dívida da empresa (spec 4.4, UC11) significa para o motorista
 * AGORA. `overdueCount` vem de `/wallet/advances/summary` (o `/wallet/summary` não traz);
 * `null` = não carregou, e o texto não afirma bloqueio.
 */
export function withdrawalPolicyNotice(allowance: WithdrawalAllowance | null, overdueCount: number | null): PolicyNotice | null {
    if (!allowance || allowance.policy === 'FREE' || allowance.openDebtCents <= 0) return null;

    if (allowance.policy === 'BLOCK_IF_OVERDUE') {
        if (overdueCount && overdueCount > 0) {
            return {
                tone: 'block',
                text: `Saque bloqueado: você tem ${overdueCount} dívida(s) vencida(s) com a empresa. Devolva o valor para liberar o saque.`,
            };
        }
        return { tone: 'info', text: 'Na sua empresa, dívida vencida bloqueia o saque. Devolva o dinheiro até o vencimento.' };
    }

    // EXCESS_ONLY: só saca o que exceder a dívida em aberto.
    if (allowance.withdrawableCents <= 0) {
        return { tone: 'block', text: `Com ${formatCurrency(allowance.openDebtCents)} em dívidas abertas, não há valor liberado para saque agora.` };
    }
    return {
        tone: 'limit',
        text: `Com ${formatCurrency(allowance.openDebtCents)} em dívidas abertas, você pode sacar até ${formatCurrency(allowance.withdrawableCents)}.`,
    };
}

type ErroSaque = { error?: { code?: unknown; maxAmountCents?: unknown } } | undefined;

const BLOCKED = 'WITHDRAWAL_BLOCKED_BY_OVERDUE_DEBT';
const EXCEEDS = 'WITHDRAWAL_EXCEEDS_AMOUNT_ABOVE_DEBT';

/**
 * `maxAmountCents` só chega se o adaptador repassar os extras (Task 1). Aceita finito >= 0 e
 * arredonda para baixo (Decimal(12,2) do back pode vir fracionado; nunca promete 1 centavo a mais).
 */
function maxOf(error: unknown): number | null {
    const max = (error as ErroSaque)?.error?.maxAmountCents;
    return typeof max === 'number' && Number.isFinite(max) && max >= 0 ? Math.floor(max) : null;
}

/** Mensagem do saque recusado. Os dois códigos da política têm texto do app (R4). */
export function withdrawalErrorMessage(error: unknown, fallback: string): string {
    const code = (error as ErroSaque)?.error?.code;
    if (code === BLOCKED) {
        return 'Saque bloqueado: você tem dívida vencida com a empresa. Devolva o valor à empresa para liberar o saque.';
    }
    if (code === EXCEEDS) {
        const max = maxOf(error);
        if (max !== null) {
            return max > 0
                ? `Você tem dívidas em aberto com a empresa. O máximo que pode sacar agora é ${formatCurrency(max)}.`
                : 'Você tem dívidas em aberto com a empresa e, por enquanto, não há valor liberado para saque.';
        }
    }
    return mensagemDaApi(error, fallback);
}

/** O máximo para a ação "Usar o máximo": só na recusa EXCESS_ONLY e só quando há o que sacar. */
export function maxWithdrawalFromError(error: unknown): number | null {
    if ((error as ErroSaque)?.error?.code !== EXCEEDS) return null;
    const max = maxOf(error);
    return max !== null && max > 0 ? max : null;
}
