import type { OccurrenceOutcome } from '@/domain/agility/service/dto'

import { occurrenceOutcomeMessage } from '../occurrenceOutcome'

describe('occurrenceOutcomeMessage', () => {
    it('returns the cancellation message for CANCELED', () => {
        expect(occurrenceOutcomeMessage('CANCELED')).toBe('Pedido cancelado.')
    })

    it('returns the retry message for PENDING', () => {
        expect(occurrenceOutcomeMessage('PENDING')).toBe('Será reenviado para nova tentativa.')
    })

    it('returns the limit-reached message for FAILED_LIMIT', () => {
        expect(occurrenceOutcomeMessage('FAILED_LIMIT')).toBe('Limite de tentativas atingido — registrado como insucesso.')
    })

    it('returns the failure message for FAILED', () => {
        expect(occurrenceOutcomeMessage('FAILED')).toBe('Pedido registrado como insucesso.')
    })

    it('covers every OccurrenceOutcome member exhaustively', () => {
        const outcomes: OccurrenceOutcome[] = ['CANCELED', 'PENDING', 'FAILED_LIMIT', 'FAILED']
        outcomes.forEach(outcome => {
            expect(typeof occurrenceOutcomeMessage(outcome)).toBe('string')
        })
    })
})
