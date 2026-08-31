/**
 * Hoje a mesma regra vive em tres lugares (SharedEtapaDados.canProceed,
 * useServiceCompletion.canFinalize e a revalidacao dentro de handleFinalizar).
 * Este utilitario passa a ser o unico dono. O caso "tudo REQUIRED" e o teste de
 * nao-regressao: ele tem que reproduzir exatamente o comportamento antigo.
 */
import { DEFAULT_FLOW_REQUIREMENTS, FlowCompletionRequirements } from '@/domain/agility/company/completionRequirements'

import { validateCompletion } from '../completionValidation'

const VAZIO = { recipientTipo: null, nome: '', documento: '', hasSignature: false, photoCount: 0 }
const CHEIO = { recipientTipo: 'cliente', nome: 'Maria', documento: '123', hasSignature: true, photoCount: 1 }

const todosOcultos: FlowCompletionRequirements = {
    recipientType: 'HIDDEN',
    recipientIdentity: 'HIDDEN',
    signature: 'HIDDEN',
    photos: { mode: 'HIDDEN', min: 1 },
}

describe('validateCompletion', () => {
    it('tudo REQUIRED e nada preenchido: bloqueia e lista os quatro faltantes', () => {
        const r = validateCompletion(DEFAULT_FLOW_REQUIREMENTS, VAZIO)

        expect(r.canProceed).toBe(false)
        expect(r.missing).toEqual(['quem recebeu', 'nome e documento', 'assinatura', 'foto'])
    })

    it('tudo REQUIRED e tudo preenchido: libera', () => {
        expect(validateCompletion(DEFAULT_FLOW_REQUIREMENTS, CHEIO)).toEqual({ canProceed: true, missing: [] })
    })

    it('nome sem documento ainda bloqueia (os dois sao um item so)', () => {
        const r = validateCompletion(DEFAULT_FLOW_REQUIREMENTS, { ...CHEIO, documento: '   ' })

        expect(r.canProceed).toBe(false)
        expect(r.missing).toEqual(['nome e documento'])
    })

    it('tudo HIDDEN libera com o estado vazio', () => {
        expect(validateCompletion(todosOcultos, VAZIO)).toEqual({ canProceed: true, missing: [] })
    })

    it('OPTIONAL nao bloqueia mesmo vazio', () => {
        const req: FlowCompletionRequirements = {
            ...DEFAULT_FLOW_REQUIREMENTS,
            signature: 'OPTIONAL',
            photos: { mode: 'OPTIONAL', min: 1 },
        }

        const r = validateCompletion(req, { ...VAZIO, recipientTipo: 'cliente', nome: 'Maria', documento: '123' })
        expect(r).toEqual({ canProceed: true, missing: [] })
    })

    it('respeita a quantidade minima de fotos', () => {
        const req: FlowCompletionRequirements = { ...DEFAULT_FLOW_REQUIREMENTS, photos: { mode: 'REQUIRED', min: 3 } }

        const duas = validateCompletion(req, { ...CHEIO, photoCount: 2 })
        expect(duas.canProceed).toBe(false)
        expect(duas.missing).toEqual(['3 fotos'])

        expect(validateCompletion(req, { ...CHEIO, photoCount: 3 }).canProceed).toBe(true)
    })

    it('o caso do cliente: servico da empresa de energia', () => {
        const req: FlowCompletionRequirements = {
            recipientType: 'HIDDEN',
            recipientIdentity: 'HIDDEN',
            signature: 'HIDDEN',
            photos: { mode: 'REQUIRED', min: 2 },
        }

        expect(validateCompletion(req, { ...VAZIO, photoCount: 1 }).missing).toEqual(['2 fotos'])
        expect(validateCompletion(req, { ...VAZIO, photoCount: 2 }).canProceed).toBe(true)
    })
})
