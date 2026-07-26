import { resolveCompanyRules } from '../companyRules'

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
