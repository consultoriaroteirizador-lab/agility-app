import { CompletionRequirements } from '@/domain/agility/company/completionRequirements'
import { RecipientRelations } from '@/domain/agility/company/recipientRelations'

/**
 * Resposta de `GET /drivers/me` — perfil do motorista logado, funcionário OU
 * terceirizado (vinculado a Provider, não a Collaborator).
 *
 * Espelha `DriverMeDto` do backend (src/driver/service/driver-profile.service.ts).
 */
export interface DriverMeResponse {
    /** Id do Driver */
    driverId: string

    /** Como o motorista está vinculado à empresa: colaborador (CLT/PJ interno) ou terceirizado */
    linkType: 'COLLABORATOR' | 'PROVIDER'

    /** Id do Collaborator (linkType COLLABORATOR) ou do Provider (linkType PROVIDER) */
    personId: string

    firstName?: string

    lastName?: string

    email?: string

    /**
     * Regras operacionais da empresa (uma parada por vez / ordem obrigatória).
     * Mesmo shape que `CompanyRules` (companyRules.ts) — resolveCompanyRules() trata
     * ausência/`undefined` como opt-out, então esses campos aqui são sempre a
     * configuração real da empresa, não um default do app.
     */
    companyFeatures: {
        enforceSingleActiveStop: boolean
        enforceStopOrder: boolean
        /** Exigencias de finalizacao por fluxo (spec 2026-08-23). */
        completionRequirements?: CompletionRequirements
        /** Opcoes de relacao de quem recebeu/entregou/acompanhou (spec 2026-08-24). */
        recipientRelations?: RecipientRelations
    }
}
