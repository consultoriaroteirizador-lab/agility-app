import { resolveCompanyRules } from '../companyRules'
import { requirementsForServiceType } from '@/domain/agility/company/completionRequirements'

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
