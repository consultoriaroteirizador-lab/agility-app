/**
 * O maior risco desta feature nao e soltar demais — e prender o motorista. Se a
 * etapa de recebedor for ocultada e nenhum ramo do roteamento assumir o lugar
 * dela, a tela cai no fallback (EtapaInicial) e nao ha caminho para frente.
 */
import { DEFAULT_FLOW_REQUIREMENTS, FlowCompletionRequirements } from '@/domain/agility/company/completionRequirements'
import { resolveCompletionStep, resolvePreviousStep } from '../completionStep'

const semRecebedor: FlowCompletionRequirements = { ...DEFAULT_FLOW_REQUIREMENTS, recipientType: 'HIDDEN' }

const recebedorOpcional: FlowCompletionRequirements = { ...DEFAULT_FLOW_REQUIREMENTS, recipientType: 'OPTIONAL' }

const tudoOculto: FlowCompletionRequirements = {
    recipientType: 'HIDDEN',
    recipientIdentity: 'HIDDEN',
    signature: 'HIDDEN',
    photos: { mode: 'HIDDEN', min: 1 },
}

describe('resolveCompletionStep — comportamento de hoje (tudo obrigatorio)', () => {
    it('depois dos checks, sem tipo escolhido, vai para o recebedor', () => {
        const step = resolveCompletionStep({
            etapa: 2,
            readyAfterChecks: true,
            hasRecipientType: false,
            requirements: DEFAULT_FLOW_REQUIREMENTS,
        })

        expect(step).toBe('recipient')
    })

    it('etapa 4 com tipo escolhido vai para os dados', () => {
        const step = resolveCompletionStep({
            etapa: 4,
            readyAfterChecks: true,
            hasRecipientType: true,
            requirements: DEFAULT_FLOW_REQUIREMENTS,
        })

        expect(step).toBe('data')
    })

    it('etapa 4 SEM tipo escolhido nao entra nos dados (volta pro recebedor)', () => {
        const step = resolveCompletionStep({
            etapa: 4,
            readyAfterChecks: true,
            hasRecipientType: false,
            requirements: DEFAULT_FLOW_REQUIREMENTS,
        })

        expect(step).toBe('recipient')
    })

    it('etapa 3 e sempre a porta do recebedor, mesmo com tipo ja escolhido', () => {
        const step = resolveCompletionStep({
            etapa: 3,
            readyAfterChecks: true,
            hasRecipientType: true,
            requirements: DEFAULT_FLOW_REQUIREMENTS,
        })

        expect(step).toBe('recipient')
    })

    it('etapa 5 e sempre a finalizacao', () => {
        const step = resolveCompletionStep({
            etapa: 5,
            readyAfterChecks: true,
            hasRecipientType: true,
            requirements: DEFAULT_FLOW_REQUIREMENTS,
        })

        expect(step).toBe('final')
    })

    it('antes dos checks nao assume nenhuma etapa (a tela decide)', () => {
        const step = resolveCompletionStep({
            etapa: 1,
            readyAfterChecks: false,
            hasRecipientType: false,
            requirements: DEFAULT_FLOW_REQUIREMENTS,
        })

        expect(step).toBeNull()
    })
})

describe('resolveCompletionStep — recebedor oculto', () => {
    it('pula direto para os dados, sem passar pelo recebedor', () => {
        const step = resolveCompletionStep({
            etapa: 2,
            readyAfterChecks: true,
            hasRecipientType: false,
            requirements: semRecebedor,
        })

        expect(step).toBe('data')
    })

    it('etapa 3 (que era a do recebedor) tambem cai nos dados — nunca no fallback', () => {
        const step = resolveCompletionStep({
            etapa: 3,
            readyAfterChecks: true,
            hasRecipientType: false,
            requirements: semRecebedor,
        })

        expect(step).toBe('data')
    })

    it('etapa 4 sem tipo escolhido entra nos dados (o tipo nao e mais exigido)', () => {
        const step = resolveCompletionStep({
            etapa: 4,
            readyAfterChecks: true,
            hasRecipientType: false,
            requirements: semRecebedor,
        })

        expect(step).toBe('data')
    })
})

describe('resolveCompletionStep — tela de dados inteira vazia', () => {
    it('com tudo oculto, vai direto para a finalizacao', () => {
        for (const etapa of [2, 3, 4]) {
            expect(
                resolveCompletionStep({
                    etapa,
                    readyAfterChecks: true,
                    hasRecipientType: false,
                    requirements: tudoOculto,
                }),
            ).toBe('final')
        }
    })

    it('so o recebedor visivel: escolhe o tipo e vai direto para a finalizacao', () => {
        const soRecebedor: FlowCompletionRequirements = { ...tudoOculto, recipientType: 'REQUIRED' }

        expect(
            resolveCompletionStep({ etapa: 2, readyAfterChecks: true, hasRecipientType: false, requirements: soRecebedor }),
        ).toBe('recipient')
        expect(
            resolveCompletionStep({ etapa: 4, readyAfterChecks: true, hasRecipientType: true, requirements: soRecebedor }),
        ).toBe('final')
    })
})

describe('resolveCompletionStep — recebedor OPTIONAL nao pode virar REQUIRED', () => {
    it('sem tipo escolhido, enquanto o motorista ainda nao passou (etapa < 4), mostra o recebedor', () => {
        for (const etapa of [2, 3]) {
            expect(
                resolveCompletionStep({
                    etapa,
                    readyAfterChecks: true,
                    hasRecipientType: false,
                    requirements: recebedorOpcional,
                }),
            ).toBe('recipient')
        }
    })

    it('sem tipo escolhido, na etapa 4 (ja passou) segue para os dados sem forcar a escolha', () => {
        const step = resolveCompletionStep({
            etapa: 4,
            readyAfterChecks: true,
            hasRecipientType: false,
            requirements: recebedorOpcional,
        })

        expect(step).toBe('data')
    })

    it('com tipo escolhido, comporta-se como REQUIRED (segue direto para os dados)', () => {
        const step = resolveCompletionStep({
            etapa: 4,
            readyAfterChecks: true,
            hasRecipientType: true,
            requirements: recebedorOpcional,
        })

        expect(step).toBe('data')
    })

    it('etapa 3 continua sendo a porta do recebedor, mesmo em OPTIONAL', () => {
        const step = resolveCompletionStep({
            etapa: 3,
            readyAfterChecks: true,
            hasRecipientType: true,
            requirements: recebedorOpcional,
        })

        expect(step).toBe('recipient')
    })
})

describe('resolveCompletionStep — combinacoes que a integracao produz de verdade', () => {
    // Antes do Task 10, com o tipo ja escolhido e o motorista ainda na etapa 2
    // numerica (delivered acabou de virar true), nenhum dos tres `if` fixos de
    // cada index.tsx batia — nem etapa===4 (nao e 4), nem etapa===3 || delivered
    // && !recipient.tipo (recipient.tipo ja setado) — e a tela caia no fallback.
    // Com o roteador, essa combinacao agora e reconhecida direto.
    it('etapa 2, ja pronto e ja com tipo escolhido: vai direto para os dados (antes caia no fallback)', () => {
        const step = resolveCompletionStep({
            etapa: 2,
            readyAfterChecks: true,
            hasRecipientType: true,
            requirements: DEFAULT_FLOW_REQUIREMENTS,
        })

        expect(step).toBe('data')
    })

    // Rascunho restaurado: `etapa` persiste no draft, `delivered` nao (Context
    // volta a `useState(false)` no remount) — ver ParadaContext, hidratacao do
    // draft. Etapa >= 3 nunca cai no gate `!readyAfterChecks && etapa < 3`
    // (so vale para etapa < 3), entao o roteador segue pela etapa persistida
    // mesmo com o check `readyAfterChecks` falso — igual ao `if (etapa === 5)`
    // avulso que ja existia antes do Task 10 (tambem nao olhava `delivered`).
    // Nao e um caminho novo de risco; documentado aqui para nao ser
    // reintroduzido como regressao por engano numa proxima mudanca.
    it('etapa 3 restaurada sem delivered: ainda assim mostra o recebedor', () => {
        const step = resolveCompletionStep({
            etapa: 3,
            readyAfterChecks: false,
            hasRecipientType: false,
            requirements: DEFAULT_FLOW_REQUIREMENTS,
        })

        expect(step).toBe('recipient')
    })

    it('etapa 4 restaurada sem delivered, com tipo ja salvo: mostra os dados', () => {
        const step = resolveCompletionStep({
            etapa: 4,
            readyAfterChecks: false,
            hasRecipientType: true,
            requirements: DEFAULT_FLOW_REQUIREMENTS,
        })

        expect(step).toBe('data')
    })
})

describe('resolvePreviousStep — a volta espelha a ida', () => {
    it('de "data": recebedor visivel -> volta para a etapa do recebedor', () => {
        expect(resolvePreviousStep({ from: 'data', requirements: DEFAULT_FLOW_REQUIREMENTS })).toEqual({
            etapa: 3,
            resetDelivered: false,
        })
    })

    it('de "data": recebedor oculto -> volta ao ponto de decisao e reabre a pergunta', () => {
        expect(resolvePreviousStep({ from: 'data', requirements: semRecebedor })).toEqual({
            etapa: 2,
            resetDelivered: true,
        })
    })

    it('de "final": tela de dados existe -> volta para os dados', () => {
        expect(resolvePreviousStep({ from: 'final', requirements: DEFAULT_FLOW_REQUIREMENTS })).toEqual({
            etapa: 4,
            resetDelivered: false,
        })
    })

    it('de "final": sem dados mas com recebedor visivel -> volta para o recebedor', () => {
        const soRecebedor: FlowCompletionRequirements = { ...tudoOculto, recipientType: 'REQUIRED' }

        expect(resolvePreviousStep({ from: 'final', requirements: soRecebedor })).toEqual({
            etapa: 3,
            resetDelivered: false,
        })
    })

    it('de "final": tudo oculto -> volta ao ponto de decisao e reabre a pergunta', () => {
        expect(resolvePreviousStep({ from: 'final', requirements: tudoOculto })).toEqual({
            etapa: 2,
            resetDelivered: true,
        })
    })
})
