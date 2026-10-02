// src/domain/agility/wallet/withdrawalAllowance.ts
import type { WalletSummaryResponse } from './dto/response/wallet.response';
import type { WithdrawalWithDebtPolicy } from './dto/types';

export interface WithdrawalAllowance {
    policy: WithdrawalWithDebtPolicy;
    /** Teto do saque pela política, em centavos inteiros (back: `withdrawableCents`). */
    withdrawableCents: number;
    /** Dívida aberta (PENDING/PARTIAL), em centavos. */
    openDebtCents: number;
}

const POLICIES: readonly string[] = ['FREE', 'BLOCK_IF_OVERDUE', 'EXCESS_ONLY'];

// Os saldos do back são Decimal(12,2): podem vir fracionados. Não exige inteiro; o teto
// arredonda para baixo (nunca promete 1 centavo que o back recusaria).
const isCents = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

/**
 * Back sem a F3, ou resposta fora do contrato, vira `null`: a tela usa o disponível como
 * teto e o back decide no pedido (R3). Nunca inventa "FREE".
 */
export function toWithdrawalAllowance(s: Partial<WalletSummaryResponse> | null | undefined): WithdrawalAllowance | null {
    if (!s) return null;
    const policy = s.withdrawalWithDebtPolicy;
    if (!policy || !POLICIES.includes(policy)) return null;
    if (!isCents(s.withdrawableBalance)) return null;
    const openDebt = Number(s.pendingAdvances ?? 0);
    return {
        policy,
        withdrawableCents: Math.floor(s.withdrawableBalance),
        openDebtCents: Number.isFinite(openDebt) && openDebt > 0 ? Math.floor(openDebt) : 0,
    };
}

/** Teto do campo de saque: o menor entre o disponível e o que a política deixa. */
export function withdrawCapCents(availableCents: number, allowance: WithdrawalAllowance | null): number {
    // Decimal(12,2) do back pode vir fracionado: o disponível também cai para o centavo inteiro.
    const disponivel = Math.floor(Math.max(0, availableCents));
    return allowance ? Math.min(disponivel, Math.floor(allowance.withdrawableCents)) : disponivel;
}
