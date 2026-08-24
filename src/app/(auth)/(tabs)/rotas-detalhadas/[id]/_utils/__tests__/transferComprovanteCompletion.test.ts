/**
 * `TransferComprovanteStep` ignorava a config da empresa (exigia nome +
 * documento + foto + assinatura hardcoded). Estes testes travam o
 * comportamento correto: bucket 'entrega' (nunca 'coleta'), sem depender do
 * campo "quem recebeu" que esta tela nunca teve.
 */
import { resolveCompletionRequirements } from '@/domain/agility/company/completionRequirements'

import { resolveTransferComprovanteCompletion } from '../transferComprovanteCompletion'

const empty = { recipientName: '', documentNumber: '', hasSignature: false, photoCount: 0 }
const filled = { recipientName: 'Fulano', documentNumber: '12345678900', hasSignature: true, photoCount: 1 }

describe('resolveTransferComprovanteCompletion — comportamento de hoje (config padrao)', () => {
    const requirements = resolveCompletionRequirements(undefined)

    it('sem nada preenchido, nao pode concluir', () => {
        const { validation } = resolveTransferComprovanteCompletion(requirements, empty)
        expect(validation.canProceed).toBe(false)
    })

    it('a lista de faltantes cobre nome/documento, assinatura e foto — nunca "quem recebeu"', () => {
        const { validation } = resolveTransferComprovanteCompletion(requirements, empty)
        expect(validation.missing).toEqual(expect.arrayContaining(['nome e documento', 'assinatura', 'foto']))
        expect(validation.missing).not.toContain('quem recebeu')
    })

    it('com tudo preenchido, pode concluir', () => {
        const { validation } = resolveTransferComprovanteCompletion(requirements, filled)
        expect(validation.canProceed).toBe(true)
        expect(validation.missing).toEqual([])
    })
})

describe('resolveTransferComprovanteCompletion — usa sempre o bucket "entrega" (delivery)', () => {
    it('config no bucket "pickup" nao tem efeito nenhum aqui', () => {
        const requirements = resolveCompletionRequirements({
            pickup: { recipientType: 'HIDDEN', recipientIdentity: 'HIDDEN', signature: 'HIDDEN', photos: { mode: 'HIDDEN', min: 1 } },
            delivery: { recipientType: 'REQUIRED', recipientIdentity: 'REQUIRED', signature: 'REQUIRED', photos: { mode: 'REQUIRED', min: 1 } },
        })

        const { validation } = resolveTransferComprovanteCompletion(requirements, empty)
        expect(validation.canProceed).toBe(false)
        expect(validation.missing).toEqual(expect.arrayContaining(['nome e documento', 'assinatura', 'foto']))
    })

    it('config no bucket "delivery" desligando assinatura e documento e obedecida (a empresa deixou de ser ignorada)', () => {
        const requirements = resolveCompletionRequirements({
            delivery: { recipientType: 'HIDDEN', recipientIdentity: 'HIDDEN', signature: 'HIDDEN', photos: { mode: 'REQUIRED', min: 2 } },
        })

        const { requirements: resolved, validation } = resolveTransferComprovanteCompletion(requirements, {
            ...empty,
            photoCount: 2,
        })

        expect(resolved.recipientIdentity).toBe('HIDDEN')
        expect(resolved.signature).toBe('HIDDEN')
        expect(validation.canProceed).toBe(true)
        expect(validation.missing).toEqual([])
    })

    it('photos.min do bucket delivery e respeitado (2 fotos exigidas, 1 nao basta)', () => {
        const requirements = resolveCompletionRequirements({
            delivery: { recipientType: 'HIDDEN', recipientIdentity: 'HIDDEN', signature: 'HIDDEN', photos: { mode: 'REQUIRED', min: 2 } },
        })

        const { validation } = resolveTransferComprovanteCompletion(requirements, { ...empty, photoCount: 1 })
        expect(validation.canProceed).toBe(false)
        expect(validation.missing).toContain('2 fotos')
    })
})
