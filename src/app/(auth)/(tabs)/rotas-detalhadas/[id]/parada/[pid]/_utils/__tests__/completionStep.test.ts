/**
 * O maior risco desta feature nao e soltar demais — e prender o motorista. Se a
 * etapa de recebedor for ocultada e nenhum ramo do roteamento assumir o lugar
 * dela, a tela cai no fallback (EtapaInicial) e nao ha caminho para frente.
 */
import { DEFAULT_FLOW_REQUIREMENTS, FlowCompletionRequirements } from '@/domain/agility/company/completionRequirements'
import { resolveCompletionStep } from '../completionStep'

const semRecebedor: FlowCompletionRequirements = { ...DEFAULT_FLOW_REQUIREMENTS, recipientType: 'HIDDEN' }

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
