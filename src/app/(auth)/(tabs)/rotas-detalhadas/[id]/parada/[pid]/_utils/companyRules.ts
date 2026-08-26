import { CompletionRequirements, FlowCompletionRequirements, resolveCompletionRequirements } from '@/domain/agility/company/completionRequirements'
import { RecipientRelation, RecipientRelations, resolveRecipientRelations } from '@/domain/agility/company/recipientRelations'

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
    const recipientRelations = resolveRecipientRelations(features?.recipientRelations)
    const completionRequirements = resolveCompletionRequirements(features?.completionRequirements)

    return {
        enforceSingleActiveStop: features?.enforceSingleActiveStop !== false,
        enforceStopOrder: features?.enforceStopOrder !== false,
        // Aqui — e so aqui — as duas configs se encontram. Ver `hideRecipientTypeWhenNoOptions`.
        completionRequirements: hideRecipientTypeWhenNoOptions(completionRequirements, recipientRelations),
        recipientRelations,
    }
}

/**
 * Lista de opcoes vazia e config VALIDA (spec 2026-08-24 §4.2 — a empresa pode
 * decidir que ninguem precisa ser identificado num fluxo). Mas se
 * `recipientType` continuar REQUIRED/OPTIONAL com zero opcoes para escolher, a
 * maquina de estados trava: `resolveCompletionStep` (`completionStep.ts`) volta
 * pra etapa 'recipient' enquanto `hasRecipientType` for falso, e nenhuma UI
 * preenche `recipient.tipo` quando nao ha opcao pra tocar — loop sem saida em
 * `SharedEtapaRecebedor`/`TransferEtapaFinalizarColeta`.
 *
 * A spec resolve isso mandando o app tratar como se o item estivesse OCULTO —
 * e ja existe uma maquina de HIDDEN inteira, testada, para os outros
 * requisitos (`resolveCompletionStep`, `resolvePreviousStep`,
 * `validateCompletion`, `SharedEtapaDados`, `TransferEtapaFinalizarColeta`).
 * Forcar `recipientType = 'HIDDEN'` aqui — no unico ponto onde
 * `completionRequirements` e `recipientRelations` sao resolvidos juntos —
 * reaproveita essa maquina em vez de duplicar a checagem em cada tela.
 *
 * Efeito colateral aceito: um valor malformado em `recipientRelations.<fluxo>`
 * (nao-array, nao-undefined/null) tambem sanitiza para lista vazia
 * (`recipientRelations.ts`) e cai aqui — em vez de travar o motorista com uma
 * config quebrada, o fluxo se comporta como se a empresa tivesse escolhido
 * "sem opcoes". Mesma logica de "min de fotos" em `completionRequirements.ts`
 * (`resolvePhotos`): nunca deixar uma config estranha fechar uma porta que o
 * motorista nao consegue abrir.
 */
function hideRecipientTypeWhenNoOptions(
    requirements: CompletionRequirements,
    relations: RecipientRelations,
): CompletionRequirements {
    const hideIfEmpty = (
        flow: FlowCompletionRequirements,
        options: RecipientRelation[],
    ): FlowCompletionRequirements =>
        options.length === 0 ? { ...flow, recipientType: 'HIDDEN' } : flow

    return {
        delivery: hideIfEmpty(requirements.delivery, relations.delivery),
        pickup: hideIfEmpty(requirements.pickup, relations.pickup),
        service: hideIfEmpty(requirements.service, relations.service),
    }
}
