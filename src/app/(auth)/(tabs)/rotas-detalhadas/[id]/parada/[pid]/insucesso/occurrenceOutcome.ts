import type { OccurrenceOutcome } from '@/domain/agility/service/dto'

/**
 * Human-readable feedback for the outcome of POST /services/:id/occurrence,
 * shown to the driver right after submitting an occurrence.
 *
 * `awaitingReturn` vem da própria resposta e é o que separa os dois
 * cancelamentos: o de pedido já despachado devolve a carga ao CD, o de pedido
 * que nunca saiu (ou de coleta/OS, que não carregam caixa) acaba ali. Dizer
 * "leve de volta" nos dois casos mandaria o motorista procurar carga que não
 * existe — a parada some da tela dele no mesmo instante.
 */
export function occurrenceOutcomeMessage(outcome: OccurrenceOutcome, awaitingReturn = false): string {
    switch (outcome) {
        case 'CANCELED':
            return awaitingReturn
                ? 'Pedido cancelado. Leve a mercadoria de volta ao CD.'
                : 'Pedido cancelado.'
        case 'PENDING':
            return 'Será reenviado para nova tentativa.'
        case 'FAILED_LIMIT':
            return 'Limite de tentativas atingido — registrado como insucesso.'
        case 'FAILED':
            return 'Pedido registrado como insucesso.'
    }
}
