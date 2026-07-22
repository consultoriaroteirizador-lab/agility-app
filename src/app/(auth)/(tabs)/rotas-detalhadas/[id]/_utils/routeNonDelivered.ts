/**
 * Merge do "Concluídas com insucesso" da rota: paradas ao vivo (que ficaram na
 * rota — FAIL_ORDER mantém routingId) + ledger de não-entregues (cancelados /
 * devolvidos à fila, que tiveram o routingId zerado e sumiram do fetch de
 * serviços). O ledger é a fonte da verdade do desfecho + motivo.
 *
 * @module rotas-detalhadas/utils/routeNonDelivered
 */

import type {
    RouteNonDeliveredItemResponse,
    RouteNonDeliveredOutcome,
} from '@/domain/agility/routing/dto'

import type { Parada } from '../_types/rota.types'

// ============================================
// VIEW-MODEL
// ============================================

/**
 * Linha renderizável do "Concluídas com insucesso" (unificado).
 */
export interface InsucessoRow {
    serviceId: string
    /** Código do pedido (do snapshot do ledger; parada ao vivo não carrega código). */
    code: string | null
    recipientName: string | null
    address: string | null
    /** Desfecho: null só para linha ao vivo sem registro no ledger (legado/borda). */
    outcome: RouteNonDeliveredOutcome | null
    reasonName: string | null
    occurredAt: string | null
}

// ============================================
// LABELS
// ============================================

/**
 * Mapeia o desfecho para um rótulo em português.
 * Fallback → 'Insucesso' (cobre null/legado e qualquer valor inesperado).
 */
export function outcomeLabel(outcome: RouteNonDeliveredOutcome | null | undefined): string {
    switch (outcome) {
        case 'CANCELED':
            return 'Cancelado'
        case 'RETURNED_TO_POOL':
            return 'Voltou para a fila'
        case 'FAILED':
            return 'Insucesso'
        default:
            return 'Insucesso'
    }
}

// ============================================
// MERGE
// ============================================

/**
 * Unifica as paradas de insucesso ao vivo com o ledger de não-entregues,
 * deduplicando por `serviceId`.
 *
 * Regras:
 * - Dedup por `serviceId`. Quando a linha existe nos dois lados, o LEDGER vence
 *   para desfecho/motivo/occurredAt; a parada ao vivo vence para
 *   recipientName/address (dados atuais). `code` vem do snapshot do ledger.
 * - Uma parada ao vivo cujo `serviceId` NÃO está no ledger continua na lista
 *   (borda/legado), com outcome null → rótulo 'Insucesso' e sem motivo.
 * - Um item só no ledger (pedido que saiu da rota) usa o snapshot congelado.
 *
 * Ordem: paradas ao vivo primeiro (mantém a ordem da rota), depois os itens que
 * só existem no ledger.
 */
export function buildInsucessoList(
    liveInsucessoParadas: Parada[],
    ledgerItems: RouteNonDeliveredItemResponse[],
): InsucessoRow[] {
    const byId = new Map<string, InsucessoRow>()

    // 1) Paradas ao vivo (ficaram na rota). Preserva a ordem da rota.
    for (const parada of liveInsucessoParadas) {
        if (!parada?.serviceId) continue
        byId.set(parada.serviceId, {
            serviceId: parada.serviceId,
            code: null,
            recipientName: parada.nome ?? null,
            address: parada.endereco ?? null,
            outcome: null,
            reasonName: null,
            occurredAt: null,
        })
    }

    // 2) Ledger = fonte da verdade do desfecho/motivo. Vence no merge para esses
    //    campos; reaproveita recipientName/address da parada ao vivo quando houver.
    for (const item of ledgerItems) {
        if (!item?.serviceId) continue
        const live = byId.get(item.serviceId)
        byId.set(item.serviceId, {
            serviceId: item.serviceId,
            code: item.serviceCode ?? live?.code ?? null,
            recipientName: live?.recipientName ?? item.recipientName ?? null,
            address: live?.address ?? item.address ?? null,
            outcome: item.outcome,
            reasonName: item.reasonName ?? null,
            occurredAt: item.occurredAt ?? null,
        })
    }

    return Array.from(byId.values())
}
