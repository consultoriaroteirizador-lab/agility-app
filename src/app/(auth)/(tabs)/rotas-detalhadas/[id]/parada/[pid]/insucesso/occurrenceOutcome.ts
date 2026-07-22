import type { OccurrenceOutcome } from '@/domain/agility/service/dto'

/**
 * Human-readable feedback for the outcome of POST /services/:id/occurrence,
 * shown to the driver right after submitting an occurrence.
 */
export function occurrenceOutcomeMessage(outcome: OccurrenceOutcome): string {
    switch (outcome) {
        case 'CANCELED':
            return 'Pedido cancelado.'
        case 'PENDING':
            return 'Será reenviado para nova tentativa.'
        case 'FAILED_LIMIT':
            return 'Limite de tentativas atingido — registrado como insucesso.'
    }
}
