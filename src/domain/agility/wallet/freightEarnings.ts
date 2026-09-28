// src/domain/agility/wallet/freightEarnings.ts
import type { TransactionResponse } from './dto/response/wallet.response';
import { LedgerSourceType, TransactionStatus, TransactionType } from './dto/types';

export interface ReleasedFreight {
    /** Id da parcela. Chave interna, nunca exibida. */
    shareId: string;
    /** Descrição da liberação, já com o código da rota ("Frete liberado - roteirização X"). */
    description: string;
    releasedCents: number;
    releasedAt: string;
}

type Line = Pick<TransactionResponse, 'id' | 'type' | 'direction' | 'status' | 'amount' | 'sourceType' | 'sourceId' | 'description' | 'createdAt'>;

/**
 * Frete que a empresa liberou, por parcela. Espelha `summaryContribution` do back
 * (`back/src/wallet/ledger/ledger-summary.ts`):
 * - FREIGHT_RELEASE da parcela (origem FREIGHT_SHARE_RELEASE) libera o bloqueado inteiro;
 * - o estorno (OUT de origem FREIGHT_SHARE_REVERSAL, mesma parcela) devolve a diferença.
 *   Liberar abaixo do bloqueado conta só o liberado; cancelar soma zero e some da lista.
 * - Liberação de recebível legado (origem LEGACY_RECEIVABLE_RELEASE) fica fora (R3).
 * Só COMPLETED conta. Linha repetida (fronteira de página) conta uma vez.
 */
export function groupReleasedFreight(lines: readonly Line[]): ReleasedFreight[] {
    const seen = new Set<string>();
    const released = new Map<string, ReleasedFreight>();
    const reversed = new Map<string, number>();

    for (const line of lines) {
        if (seen.has(line.id)) continue;
        seen.add(line.id);
        if (line.status !== TransactionStatus.COMPLETED) continue;

        if (line.type === TransactionType.FREIGHT_RELEASE && line.sourceType === LedgerSourceType.FREIGHT_SHARE_RELEASE) {
            const current = released.get(line.sourceId);
            released.set(line.sourceId, {
                shareId: line.sourceId,
                description: line.description,
                releasedCents: (current?.releasedCents ?? 0) + line.amount,
                releasedAt: line.createdAt,
            });
        } else if (line.direction === 'OUT' && line.sourceType === LedgerSourceType.FREIGHT_SHARE_REVERSAL) {
            reversed.set(line.sourceId, (reversed.get(line.sourceId) ?? 0) + line.amount);
        }
    }

    return [...released.values()]
        .map((item) => ({ ...item, releasedCents: item.releasedCents - (reversed.get(item.shareId) ?? 0) }))
        .filter((item) => item.releasedCents > 0)
        .sort((a, b) => b.releasedAt.localeCompare(a.releasedAt));
}

export function totalReleasedCents(items: readonly ReleasedFreight[]): number {
    return items.reduce((sum, item) => sum + item.releasedCents, 0);
}
