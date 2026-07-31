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

import { resolveNotasBadge } from './paradaDisplay'

// ============================================
// VIEW-MODEL
// ============================================

/**
 * Linha renderizável do "Concluídas com insucesso" (unificado).
 */
export interface InsucessoRow {
    /** Id do pedido; numa parada agrupada, o do REPRESENTANTE (`pedidos[0]`). */
    serviceId: string
    /** Código do pedido (do snapshot do ledger; parada ao vivo não carrega código). */
    code: string | null
    recipientName: string | null
    address: string | null
    /** Desfecho: null só para linha ao vivo sem registro no ledger (legado/borda). */
    outcome: RouteNonDeliveredOutcome | null
    reasonName: string | null
    occurredAt: string | null
    /** Notas da parada (1 quando a linha é de um pedido avulso do ledger). */
    totalNotas: number
    /** Notas efetivamente entregues — o "3" de "3 de 5 entregues" (§3.3). */
    notasEntregues: number
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
 * Quantos pedidos existem SÓ no ledger — os que saíram da rota (cancelados /
 * devolvidos à fila zeram o `routingId`) e por isso não estão mais em `paradas`.
 *
 * É o número que falta nos contadores da rota: `countParadasByStatus` só enxerga
 * as paradas vivas, então sem isto a tela mostra "0 de 1 concluídas" enquanto
 * lista 3 cards de insucesso logo abaixo.
 *
 * Deduplicado por `serviceId` — o ledger pode ter mais de uma ocorrência para o
 * mesmo pedido, e quem ainda tem parada viva já é contado por lá.
 *
 * Recebe os ids (não as paradas) porque os chamadores têm formas diferentes: a
 * tela da rota tem `Parada[]`, o histórico tem os serviços crus.
 */
export function countLedgerOnly(
    liveServiceIds: (string | null | undefined)[],
    ledgerItems: RouteNonDeliveredItemResponse[],
): number {
    const liveIds = new Set(liveServiceIds.filter((id): id is string => !!id))
    const ledgerOnly = new Set<string>()
    for (const item of ledgerItems) {
        if (!item?.serviceId || liveIds.has(item.serviceId)) continue
        ledgerOnly.add(item.serviceId)
    }
    return ledgerOnly.size
}

/**
 * Unifica as paradas de insucesso ao vivo com o ledger de não-entregues.
 *
 * A unidade da lista é a PARADA (a porta), não a nota: uma porta com 5 notas em
 * que 1 foi recusada rende UMA linha, "4 de 5 entregues" (§3.3). Sem isto ela
 * renderia duas — a da porta (chaveada no representante, que muitas vezes foi
 * ENTREGUE) e mais uma vinda do ledger para a nota recusada — e o contador ao
 * lado discordaria da lista.
 *
 * Regras:
 * - Chave da linha ao vivo = `parada.serviceId` (o representante). Todo pedido
 *   do grupo aponta para essa chave, então um item do ledger de QUALQUER nota da
 *   porta cai na linha da porta em vez de abrir linha nova.
 * - O LEDGER vence para desfecho/motivo/occurredAt (é a fonte da verdade); a
 *   parada ao vivo vence para recipientName/address (dados atuais). Com mais de
 *   uma nota recusada na mesma porta, vale a última ocorrência do ledger — a
 *   linha resume a porta, e o detalhe nota-a-nota vive na tela da parada.
 * - `code` só é adotado quando a linha é de UMA nota: numa porta agrupada, o
 *   código de uma nota isolada identificaria mal a parada inteira.
 * - Uma parada ao vivo sem registro no ledger continua na lista (borda/legado),
 *   com outcome null → rótulo 'Insucesso' e sem motivo.
 * - Um item só no ledger (pedido que saiu da rota, com o `routingId` zerado) vira
 *   linha própria com o snapshot congelado.
 *
 * Ordem: paradas ao vivo primeiro (mantém a ordem da rota), depois os itens que
 * só existem no ledger.
 */
export function buildInsucessoList(
    liveInsucessoParadas: Parada[],
    ledgerItems: RouteNonDeliveredItemResponse[],
): InsucessoRow[] {
    const byId = new Map<string, InsucessoRow>()
    /** Id de qualquer nota → id do representante da parada dela. */
    const representantePorPedido = new Map<string, string>()

    // 1) Paradas ao vivo (ficaram na rota). Preserva a ordem da rota.
    for (const parada of liveInsucessoParadas) {
        if (!parada?.serviceId) continue
        const badge = resolveNotasBadge(parada)
        byId.set(parada.serviceId, {
            serviceId: parada.serviceId,
            code: null,
            recipientName: parada.nome ?? null,
            address: parada.endereco ?? null,
            outcome: null,
            reasonName: null,
            occurredAt: null,
            totalNotas: badge.totalNotas,
            notasEntregues: badge.notasEntregues,
        })
        representantePorPedido.set(parada.serviceId, parada.serviceId)
        for (const pedido of parada.pedidos ?? []) {
            if (pedido?.id) representantePorPedido.set(pedido.id, parada.serviceId)
        }
    }

    // 2) Ledger = fonte da verdade do desfecho/motivo. Vence no merge para esses
    //    campos; reaproveita recipientName/address da parada ao vivo quando houver.
    for (const item of ledgerItems) {
        if (!item?.serviceId) continue
        const chave = representantePorPedido.get(item.serviceId) ?? item.serviceId
        const live = byId.get(chave)
        const ehParadaAgrupada = (live?.totalNotas ?? 1) > 1
        byId.set(chave, {
            serviceId: chave,
            code: ehParadaAgrupada ? live?.code ?? null : item.serviceCode ?? live?.code ?? null,
            recipientName: live?.recipientName ?? item.recipientName ?? null,
            address: live?.address ?? item.address ?? null,
            outcome: item.outcome,
            reasonName: item.reasonName ?? null,
            occurredAt: item.occurredAt ?? null,
            totalNotas: live?.totalNotas ?? 1,
            notasEntregues: live?.notasEntregues ?? 0,
        })
    }

    return Array.from(byId.values())
}
