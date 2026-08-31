import { requirementsForServiceType } from '@/domain/agility/company/completionRequirements'

import { resolveCompanyRules } from '../companyRules'
import { resolveCompletionStep } from '../completionStep'

describe('resolveCompanyRules', () => {
    it('respeita o desligamento EXPLÍCITO vindo do backend', () => {
        const rules = resolveCompanyRules({ enforceSingleActiveStop: false, enforceStopOrder: false })
        expect(rules.enforceSingleActiveStop).toBe(false)
        expect(rules.enforceStopOrder).toBe(false)
    })

    it('mantém as regras LIGADAS quando o perfil ainda não carregou', () => {
        // O backend trata como opt-out (ligadas por padrão). Desligar por falta de
        // dado inverte a intenção da empresa e libera o motorista sem querer.
        const rules = resolveCompanyRules(null)
        expect(rules.enforceSingleActiveStop).toBe(true)
        expect(rules.enforceStopOrder).toBe(true)
    })

    it('mantém ligadas quando o campo vem ausente do payload', () => {
        const rules = resolveCompanyRules({} as never)
        expect(rules.enforceSingleActiveStop).toBe(true)
        expect(rules.enforceStopOrder).toBe(true)
    })
})

/**
 * A regra e OPT-OUT e FECHADA: perfil que nao chegou, campo ausente ou valor
 * estranho vindo do backend significam "exija tudo". O app ja teve o bug de
 * tratar "nao sei" como "pode tudo" (ver docblock de companyRules.ts) — este
 * teste existe para isso nao voltar pela porta da finalizacao.
 */
const TUDO_OBRIGATORIO = {
    recipientType: 'REQUIRED',
    recipientIdentity: 'REQUIRED',
    signature: 'REQUIRED',
    photos: { mode: 'REQUIRED', min: 1 },
}

describe('resolveCompanyRules — completionRequirements', () => {
    it('perfil ausente exige tudo nos tres fluxos', () => {
        const rules = resolveCompanyRules(undefined)

        expect(rules.completionRequirements.delivery).toEqual(TUDO_OBRIGATORIO)
        expect(rules.completionRequirements.pickup).toEqual(TUDO_OBRIGATORIO)
        expect(rules.completionRequirements.service).toEqual(TUDO_OBRIGATORIO)
        // as flags antigas continuam intactas
        expect(rules.enforceSingleActiveStop).toBe(true)
        expect(rules.enforceStopOrder).toBe(true)
    })

    it('backend antigo (sem o campo) exige tudo', () => {
        const rules = resolveCompanyRules({ enforceSingleActiveStop: false, enforceStopOrder: false } as never)

        expect(rules.completionRequirements.service).toEqual(TUDO_OBRIGATORIO)
        expect(rules.enforceSingleActiveStop).toBe(false)
    })

    it('modo desconhecido cai em REQUIRED', () => {
        const rules = resolveCompanyRules({
            completionRequirements: { service: { signature: 'TALVEZ' } },
        } as never)

        expect(rules.completionRequirements.service.signature).toBe('REQUIRED')
    })

    it('le a config real quando ela vem completa', () => {
        const rules = resolveCompanyRules({
            completionRequirements: {
                service: {
                    recipientType: 'HIDDEN',
                    recipientIdentity: 'HIDDEN',
                    signature: 'HIDDEN',
                    photos: { mode: 'OPTIONAL', min: 1 },
                },
            },
        } as never)

        expect(rules.completionRequirements.service.recipientType).toBe('HIDDEN')
        expect(rules.completionRequirements.delivery).toEqual(TUDO_OBRIGATORIO)
    })
})

/**
 * C1 da revisao: `recipientRelations.<fluxo> = []` (config valida — spec
 * 2026-08-24 §4.2) combinada com `recipientType` default REQUIRED travava o
 * motorista num loop sem saida em `resolveCompletionStep`: a etapa 'recipient'
 * nunca aceita `hasRecipientType=false`, e nao ha UI que preencha `tipo` sem
 * nenhuma opcao para tocar. `resolveCompanyRules` agora forca `recipientType
 * = 'HIDDEN'` quando a lista resolvida esta vazia — estes testes prezam pela
 * PROVA de que o loop fecha, nao so pela config isolada.
 */
describe('resolveCompanyRules — lista de opcoes vazia esconde recipientType (evita o loop)', () => {
    it('recipientRelations.delivery vazio forca recipientType HIDDEN so no fluxo de entrega', () => {
        const rules = resolveCompanyRules({ recipientRelations: { delivery: [] } } as never)

        expect(rules.completionRequirements.delivery.recipientType).toBe('HIDDEN')
        // Os outros dois fluxos nao vieram com lista vazia — continuam no default.
        expect(rules.completionRequirements.pickup.recipientType).toBe('REQUIRED')
        expect(rules.completionRequirements.service.recipientType).toBe('REQUIRED')
    })

    it('recipientRelations.pickup vazio forca so o bucket de pickup', () => {
        const rules = resolveCompanyRules({ recipientRelations: { pickup: [] } } as never)
        expect(rules.completionRequirements.pickup.recipientType).toBe('HIDDEN')
        expect(rules.completionRequirements.delivery.recipientType).toBe('REQUIRED')
    })

    it('recipientRelations.service vazio forca so o bucket de service', () => {
        const rules = resolveCompanyRules({ recipientRelations: { service: [] } } as never)
        expect(rules.completionRequirements.service.recipientType).toBe('HIDDEN')
    })

    it('a config PODE mandar recipientType=OPTIONAL explicito — lista vazia ainda assim esconde', () => {
        // A trava nao e so contra REQUIRED: OPTIONAL com etapa < 4 tambem
        // insiste em 'recipient' (`resolveCompletionStep`) sem nenhuma opcao
        // para o motorista escolher.
        const rules = resolveCompanyRules({
            recipientRelations: { delivery: [] },
            completionRequirements: { delivery: { recipientType: 'OPTIONAL' } },
        } as never)

        expect(rules.completionRequirements.delivery.recipientType).toBe('HIDDEN')
    })

    it('valor malformado (nao-array) em recipientRelations tambem sanitiza pra vazio e fecha a mesma porta', () => {
        // Terceira porta apontada na revisao: `resolveFlow` so cai no default
        // quando o valor e undefined/null — qualquer outra coisa que nao seja
        // array vira lista vazia. Sem a correcao aqui, isso seria falha ABERTA
        // direto no estado travado; com ela, vira "sem opcoes" (HIDDEN) — nunca
        // um loop.
        const rules = resolveCompanyRules({ recipientRelations: { delivery: 'nao-e-array' } } as never)
        expect(rules.recipientRelations.delivery).toEqual([])
        expect(rules.completionRequirements.delivery.recipientType).toBe('HIDDEN')
    })

    it('lista NAO vazia nao mexe em recipientType (sem regressao)', () => {
        const rules = resolveCompanyRules({
            recipientRelations: { delivery: [{ code: 'PORTEIRO', label: 'Porteiro' }] },
        } as never)
        expect(rules.completionRequirements.delivery.recipientType).toBe('REQUIRED')
    })

    it('PROVA DO LOOP FECHADO: resolveCompletionStep nao volta mais para "recipient" quando a lista esta vazia', () => {
        const rules = resolveCompanyRules({ recipientRelations: { delivery: [] } } as never)
        const requirements = requirementsForServiceType(rules.completionRequirements, 'entrega')

        // Motorista chegou na etapa 3 (recebedor), nunca escolheu nada — nao
        // ha opcao para escolher — e clicou "Proximo".
        const step = resolveCompletionStep({
            etapa: 3,
            readyAfterChecks: true,
            hasRecipientType: false,
            requirements,
        })

        // Antes da correcao, isto devolvia 'recipient' de novo — loop sem
        // saida, nenhuma UI resolve. Com recipientType HIDDEN, a etapa de
        // recebedor deixa de existir para este fluxo e o motorista segue.
        expect(step).not.toBe('recipient')
    })
})

describe('requirementsForServiceType', () => {
    it('mapeia os nomes de tela para os nomes do contrato', () => {
        const req = resolveCompanyRules({
            completionRequirements: {
                delivery: { signature: 'HIDDEN' },
                pickup: { signature: 'OPTIONAL' },
                service: { signature: 'REQUIRED' },
            },
        } as never).completionRequirements

        expect(requirementsForServiceType(req, 'entrega').signature).toBe('HIDDEN')
        expect(requirementsForServiceType(req, 'coleta').signature).toBe('OPTIONAL')
        expect(requirementsForServiceType(req, 'servico').signature).toBe('REQUIRED')
    })
})
