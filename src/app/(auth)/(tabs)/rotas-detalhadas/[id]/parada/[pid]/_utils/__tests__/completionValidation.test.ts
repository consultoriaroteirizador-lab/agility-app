/**
 * Hoje a mesma regra vive em tres lugares (SharedEtapaDados.canProceed,
 * useServiceCompletion.canFinalize e a revalidacao dentro de handleFinalizar).
 * Este utilitario passa a ser o unico dono. O caso "tudo REQUIRED" e o teste de
 * nao-regressao: ele tem que reproduzir exatamente o comportamento antigo.
 */
import { DEFAULT_FLOW_REQUIREMENTS, FlowCompletionRequirements } from '@/domain/agility/company/completionRequirements'

import { validateCompletion } from '../completionValidation'

const VAZIO = { recipientTipo: null, nome: '', documento: '', hasSignature: false, photoCount: 0, hasLinkedForm: false }
const CHEIO = { recipientTipo: 'cliente', nome: 'Maria', documento: '123', hasSignature: true, photoCount: 1, hasLinkedForm: false }

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

    // Regra do dono (21/09/2026): nao da para finalizar um servico sem NENHUMA
    // evidencia. Com os quatro itens ocultos a tela de dados nem existe, entao a
    // unica saida e o formulario proprio do pedido.
    describe('tudo HIDDEN: precisa de formulario ou de alguma evidencia', () => {
        it('sem formulario e sem nada registrado: BLOQUEIA com mensagem inteira', () => {
            const r = validateCompletion(todosOcultos, VAZIO)

            expect(r.canProceed).toBe(false)
            // nao ha campo a citar — a tela esta vazia
            expect(r.missing).toEqual([])
            expect(r.blockMessage).toContain('formulário')
            expect(r.blockMessage).toContain('evidência')
        })

        it('com formulario vinculado ao pedido: libera (o formulario e a evidencia)', () => {
            expect(validateCompletion(todosOcultos, { ...VAZIO, hasLinkedForm: true })).toEqual({
                canProceed: true,
                missing: [],
            })
        })

        // Rascunho anterior a mudanca de config: o dado ja existe, nao faz sentido
        // travar o motorista por causa dele.
        it('evidencia sobrevivente de rascunho libera mesmo sem formulario', () => {
            expect(validateCompletion(todosOcultos, { ...VAZIO, photoCount: 1 }).canProceed).toBe(true)
            expect(validateCompletion(todosOcultos, { ...VAZIO, hasSignature: true }).canProceed).toBe(true)
            expect(validateCompletion(todosOcultos, { ...VAZIO, nome: 'Maria' }).canProceed).toBe(true)
            expect(validateCompletion(todosOcultos, { ...VAZIO, recipientTipo: 'cliente' }).canProceed).toBe(true)
        })

        // Um item visivel ja basta: a tela tem onde registrar algo.
        it('um unico item OPTIONAL desfaz o oco e libera vazio', () => {
            const r = validateCompletion({ ...todosOcultos, signature: 'OPTIONAL' }, VAZIO)
            expect(r).toEqual({ canProceed: true, missing: [] })
        })
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

    // Item obrigatorio faltando continua sendo o caso comum: a mensagem tem que
    // citar o campo, nao a mensagem generica do caso oco.
    it('faltando obrigatorio nao usa a mensagem do caso oco', () => {
        const r = validateCompletion(DEFAULT_FLOW_REQUIREMENTS, VAZIO)

        expect(r.blockMessage).toBeUndefined()
        expect(r.missing.length).toBeGreaterThan(0)
    })
})
