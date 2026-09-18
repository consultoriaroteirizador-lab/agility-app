import type { OccurrenceOutcome } from '@/domain/agility/service/dto'

import { occurrenceOutcomeMessage } from '../occurrenceOutcome'

describe('occurrenceOutcomeMessage', () => {
    it('returns the cancellation message for CANCELED', () => {
        expect(occurrenceOutcomeMessage('CANCELED')).toBe('Pedido cancelado.')
    })

    it('avisa que a carga volta ao CD quando o cancelamento gerou devolucao', () => {
        expect(occurrenceOutcomeMessage('CANCELED', true)).toBe('Pedido cancelado. Leve a mercadoria de volta ao CD.')
    })

    it('cancelamento sem devolucao nao manda o motorista levar nada', () => {
        expect(occurrenceOutcomeMessage('CANCELED', false)).toBe('Pedido cancelado.')
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
            expect(typeof occurrenceOutcomeMessage(outcome, true)).toBe('string')
        })
    })
})
