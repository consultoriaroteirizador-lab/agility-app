import { CompletionRequirements, resolveCompletionRequirements } from '@/domain/agility/company/completionRequirements'
import { RecipientRelations, resolveRecipientRelations } from '@/domain/agility/company/recipientRelations'

export interface CompanyRules {
    enforceSingleActiveStop: boolean
    enforceStopOrder: boolean
    /**
     * O que o motorista precisa preencher para concluir, por fluxo. Mesma logica
     * de falha fechada das flags acima: ausente = exija tudo.
     */
    completionRequirements: CompletionRequirements
    /**
     * Opcoes de relacao de quem recebeu/entregou/acompanhou, por fluxo. Mesma
     * logica de falha fechada: ausente = use os defaults de fabrica.
     */
    recipientRelations: RecipientRelations
}

/**
 * Regras de execução de rota, com a MESMA semântica do backend: OPT-OUT — ligadas
 * por padrão, só desligam com `false` explícito.
 *
 * O app usava `=== true`, que transforma "não sei" em "pode tudo": perfil não
 * carregado desligava as duas regras. Para o motorista terceirizado isso era
 * permanente (o endpoint antigo dava 404 para ele); para qualquer motorista,
 * bastava uma falha de rede. Falha aberta em regra operacional é o pior default
 * possível — na dúvida, a regra vale.
 */
export function resolveCompanyRules(
    features: Partial<CompanyRules> | null | undefined,
): CompanyRules {
    return {
        enforceSingleActiveStop: features?.enforceSingleActiveStop !== false,
        enforceStopOrder: features?.enforceStopOrder !== false,
        completionRequirements: resolveCompletionRequirements(features?.completionRequirements),
        recipientRelations: resolveRecipientRelations(features?.recipientRelations),
    }
}
