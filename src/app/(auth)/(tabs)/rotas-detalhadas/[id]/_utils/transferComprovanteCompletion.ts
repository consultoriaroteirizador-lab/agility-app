/**
 * "O que falta para eu poder concluir?" do comprovante do handoff CD -> CD
 * (`TransferComprovanteStep`, alcancavel de `TransferLegExecution`).
 *
 * Achada na revisao final da branch como uma QUINTA copia viva da regra que a
 * `parada/[id]` centralizou em `validateCompletion` — esta ignorava a config
 * da empresa e sempre exigia nome + documento + foto + assinatura, hardcoded.
 * Reusa `validateCompletion` com o bucket 'entrega' (delivery).
 *
 * Por que 'entrega' e nao 'coleta': este wizard tem so DUAS etapas —
 * `overview` (cards de CD origem/destino + mapa, sem pedir evidencia nenhuma)
 * e `comprovante`, alcancada só depois de "Cheguei no CD de destino"
 * (`TransferLegExecution.tsx`). Nao existe uma etapa equivalente na chegada
 * ao CD de ORIGEM — o carregamento nao pede comprovante. Ou seja, o unico
 * comprovante deste wizard e sempre do lado de RECEBIMENTO no destino, nunca
 * do lado de coleta — o mesmo papel que `sharedType = isPickup ? 'coleta' :
 * 'entrega'` resolve como 'entrega' quando `isPickup` e `false`, em
 * `parada/[pid]/transfer/index.tsx`.
 *
 * Diferenca estrutural desta tela: ela nao tem o seletor "quem recebeu"
 * (cliente/porteiro/vizinho/...) do last-mile (`SharedEtapaRecebedor`) — so a
 * identidade de quem recebeu no CD (nome + documento, via
 * `DocumentCollectionForm`). `requirements.recipientType` nao tem campo de UI
 * correspondente aqui, entao passamos um valor sempre preenchido para
 * `recipientTipo` em `validateCompletion` — do contrario "quem recebeu"
 * apareceria como faltante permanentemente, por um campo que esta tela nunca
 * teve, travando a empresa com config padrao (tudo REQUIRED) neste handoff.
 */
import { CompletionRequirements, FlowCompletionRequirements, requirementsForServiceType } from '@/domain/agility/company/completionRequirements'

import { CompletionValidation, validateCompletion } from '../parada/[pid]/_utils/completionValidation'

export interface TransferComprovanteState {
    recipientName: string
    documentNumber: string
    hasSignature: boolean
    photoCount: number
}

export interface TransferComprovanteCompletion {
    /** Requisitos do bucket 'entrega' — usar para decidir o que mostrar na tela. */
    requirements: FlowCompletionRequirements
    validation: CompletionValidation
}

export function resolveTransferComprovanteCompletion(
    completionRequirements: CompletionRequirements,
    state: TransferComprovanteState,
): TransferComprovanteCompletion {
    const requirements = requirementsForServiceType(completionRequirements, 'entrega')

    const validation = validateCompletion(requirements, {
        // Sempre preenchido — ver nota acima sobre a ausencia do seletor de tipo.
        recipientTipo: 'cd-destino',
        nome: state.recipientName,
        documento: state.documentNumber,
        hasSignature: state.hasSignature,
        photoCount: state.photoCount,
    })

    return { requirements, validation }
}
