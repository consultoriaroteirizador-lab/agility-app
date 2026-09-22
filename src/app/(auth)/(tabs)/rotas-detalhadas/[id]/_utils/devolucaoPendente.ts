/**
 * "Devolver ao CD" da tela da rota: o que o motorista ainda carrega e precisa
 * entregar de volta, lido de `GET /routings/:id/pending-returns`.
 *
 * Existe porque a lista de paradas NÃO responde a essa pergunta. O pedido
 * cancelado com a carga já na rua sai da rota no mesmo gesto do cancelamento
 * (perde `routing_id`), some da lista de paradas e não volta pelo ledger de
 * não-entregues: lá quem vence o merge é a trilha do cancelamento, que grava
 * `awaitingReturn: false` fixo. A obrigação de devolver só existe na tentativa.
 *
 * Mesma fonte que a parada de RETORNO já confere (`returnChecklist.ts`) — as
 * duas telas mostram a mesma lista, uma antes e outra na hora da entrega.
 *
 * @module rotas-detalhadas/utils/devolucaoPendente
 */

import type { PendingReturnResponse } from '@/domain/agility/routing/routingAPI'

// ============================================
// VIEW-MODEL
// ============================================

/** Linha renderizável da seção "Devolver ao CD". */
export interface DevolucaoRow {
    serviceId: string
    /** Código da etiqueta; cai para o título e, por fim, para um rótulo genérico. */
    titulo: string
    /** Motivo congelado na ocorrência. */
    motivo: string | null
    desfecho: string
    /** "Tentativa 2 de 3"; null quando o backend não mandou o limite. */
    tentativa: string | null
    /** O pedido não é mais parada da rota — é o que explica o sumiço da tela. */
    foraDaRota: boolean
}

/** Último recurso quando a pendência não traz código nem título. */
const ROTULO_PADRAO = 'Pedido devolvido'

// ============================================
// LABELS
// ============================================

/**
 * Rótulo do porquê a carga volta, a partir do efeito do motivo.
 *
 * `side_effect` é TEXTO no banco (sem enum), então o mapa é exaustivo nos três
 * valores conhecidos e tem fallback — mesmo padrão de `outcomeLabel`.
 */
export function devolucaoDesfechoLabel(sideEffect: string | null | undefined): string {
    switch (sideEffect) {
        case 'CANCEL_ORDER':
            return 'Cancelado pela central'
        case 'FAIL_ORDER':
        case 'RETURN_TO_POOL':
            return 'Entrega não realizada'
        default:
            return 'Devolver ao CD'
    }
}

// ============================================
// MONTAGEM
// ============================================

/**
 * Converte as pendências do backend em linhas da seção.
 *
 * Preserva a ordem recebida (o backend ordena por `failed_at asc`) e descarta
 * pendência sem `serviceId` — sem id não há como abrir o pedido nem casar com a
 * parada, e a linha só confundiria a contagem de caixas.
 *
 * `serviceIdsNaRota` são os ids que a rota ainda mostra como parada; quem não
 * está lá recebe `foraDaRota`, que é o caso do cancelado.
 */
export function buildDevolucaoList(
    pendentes: PendingReturnResponse[],
    serviceIdsNaRota: (string | null | undefined)[],
): DevolucaoRow[] {
    const naRota = new Set(serviceIdsNaRota.filter((id): id is string => !!id))

    const rows: DevolucaoRow[] = []
    for (const pendente of pendentes) {
        if (!pendente?.serviceId) continue
        const maxAttempts = Number(pendente.maxAttempts ?? 0)
        rows.push({
            serviceId: pendente.serviceId,
            titulo: pendente.serviceCode || pendente.title || ROTULO_PADRAO,
            motivo: pendente.reasonName ?? null,
            desfecho: devolucaoDesfechoLabel(pendente.sideEffect),
            tentativa: maxAttempts > 0 ? `Tentativa ${pendente.attemptNumber} de ${maxAttempts}` : null,
            foraDaRota: !naRota.has(pendente.serviceId),
        })
    }
    return rows
}
