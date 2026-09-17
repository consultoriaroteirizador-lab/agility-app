/**
 * Trava do "Cheguei no retorno": o retorno é a última parada, então o check-in
 * só libera quando as demais paradas já estão encerradas para o motorista.
 *
 * `AT_HUB` significa "descarregado num CD" e só encerra a parada quando o trecho
 * é de MALHA: desde que a devolução passou a gravar custódia, o pedido devolvido
 * numa rota comum também fica `AT_HUB`, e contá-lo como entregue liberaria o
 * retorno com pedido ainda por fazer.
 *
 * @module rotas-detalhadas/parada/utils/returnGate
 */

/** Papel do trecho na malha; null/undefined em rota comum. */
export type LegType = 'TRANSFER' | 'LAST_MILE' | null | undefined

/** Status terminal de parada (concluída/falha/cancelada). */
export function isTerminalStatus(status?: string | null): boolean {
    return ['COMPLETED', 'FAILED', 'CANCELED', 'CANCELLED'].includes(String(status ?? '').toUpperCase())
}

/**
 * Pedido já entregue no CD de destino (handoff feito) — passou a ser
 * responsabilidade do CD, não do motorista. Conta como "concluído p/ o trecho"
 * mesmo com status ainda PENDING, porque o pedido recebido segue no last-mile e
 * nunca vira COMPLETED na transferência. `AT_ORIGIN`/`IN_TRANSIT` são
 * pré-handoff e `EXCEPTION` é desvio: nenhum conta.
 */
export function isHandedOff(phase?: string | null, legType?: LegType): boolean {
    const fase = String(phase ?? '').toUpperCase()
    if (fase === 'OUT_FOR_DELIVERY' || fase === 'DELIVERED') return true
    return fase === 'AT_HUB' && String(legType ?? '').toUpperCase() === 'TRANSFER'
}

/** Campos que a trava usa de cada parada da rota. */
export interface ParadaGate {
    serviceType?: string | null
    status?: string | null
    custodyPhase?: string | null
}

/** Todas as paradas que não são o retorno já estão encerradas? */
export function othersConcluidos(services: ParadaGate[] | undefined | null, legType: LegType): boolean {
    const others = (services ?? []).filter(
        (s) => String(s.serviceType ?? '').toUpperCase() !== 'RETURN',
    )
    return others.every((s) => isTerminalStatus(s.status) || isHandedOff(s.custodyPhase, legType))
}
