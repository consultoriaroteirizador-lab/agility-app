/**
 * Registro durável (ledger de override-audit) de um pedido NÃO ENTREGUE numa rota.
 *
 * Pedidos que foram CANCELADOS ou DEVOLVIDOS À FILA têm o `routingId` zerado e
 * somem do `GET /services?routingId=`. Este endpoint expõe o registro imutável
 * do ledger para que eles continuem aparecendo no "Concluídas com insucesso" da
 * rota — cada um com o desfecho (outcome) e o motivo (reasonName) congelados.
 *
 * Contrato: `GET /routings/:routingId/non-delivered` → ARRAY CRU (sem envelope).
 *
 * @module domain/agility/routing/dto/response/route-non-delivered
 */

/** Desfecho do pedido não entregue (fonte da verdade: ledger). */
export type RouteNonDeliveredOutcome = 'CANCELED' | 'RETURNED_TO_POOL' | 'FAILED'

/** Tipo do evento de ocorrência que gerou o registro. */
export type RouteNonDeliveredKind =
    | 'ORDER_CANCELLATION'
    | 'ORDER_REDELIVERY'
    | 'ORDER_FAILURE'

/**
 * Item do ledger de não-entregues de uma rota.
 * Nomes de campos byte-exatos ao contrato do backend.
 */
export interface RouteNonDeliveredItemResponse {
    serviceId: string
    serviceCode: string | null
    recipientName: string | null
    /** Endereço já formatado em linha única. */
    address: string | null
    kind: RouteNonDeliveredKind
    outcome: RouteNonDeliveredOutcome
    /** Nome congelado do catálogo/motivo no momento da ocorrência. */
    reasonName: string | null
    currentStatus: string | null
    /** ISO 8601 — quando a ocorrência foi registrada. */
    occurredAt: string
}
