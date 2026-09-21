/**
 * Unico dono da pergunta "o motorista ja pode concluir?".
 *
 * Antes esta regra estava escrita tres vezes (a porta da etapa de dados, o botao
 * de finalizar e a revalidacao dentro do handler), com as tres tendo que
 * concordar por coincidencia. Agora as tres chamam isto.
 */
import { FlowCompletionRequirements } from '@/domain/agility/company/completionRequirements'

export interface CompletionState {
    /** Tipo escolhido na etapa "Quem recebeu?" (cliente, porteiro, ...). */
    recipientTipo?: string | null
    nome?: string | null
    documento?: string | null
    hasSignature: boolean
    photoCount: number
    /**
     * O PEDIDO tem formulario proprio vinculado (`service.formGroupIds`).
     *
     * Obrigatorio de proposito, sem default: um chamador que esqueca o campo
     * cairia no caso permissivo justamente na unica situacao em que a tela fica
     * vazia. Mesmo criterio do `serviceType` em `useServiceCompletion`.
     */
    hasLinkedForm: boolean
}

export interface CompletionValidation {
    canProceed: boolean
    /** Rotulos do que falta, na ordem da tela. Vazio quando pode seguir. */
    missing: string[]
    /**
     * Mensagem inteira (nao um rotulo de campo) quando a conclusao esta barrada
     * por falta de QUALQUER evidencia. Nesse caso `missing` fica vazio: nao ha
     * campo a citar, porque a empresa ocultou todos.
     */
    blockMessage?: string
}

/**
 * Espelho da trava do backend (`SERVICE_COMPLETION_WITHOUT_EVIDENCE`): com os
 * quatro itens ocultos a tela de finalizacao nao tem campo nenhum, entao o
 * motorista concluiria sem absolutamente nada. So passa quando o pedido tem
 * formulario proprio (o formulario e a evidencia) ou quando alguma evidencia
 * sobreviveu de um rascunho anterior a mudanca de configuracao.
 */
const preenchido = (v?: string | null) => !!v?.trim()

const MSG_SEM_EVIDENCIA =
    'É preciso preencher o formulário ou registrar ao menos uma evidência para finalizar. ' +
    'Fale com a central para ajustar os dados de finalização.'

function tudoOculto(r: FlowCompletionRequirements): boolean {
    return (
        r.recipientType === 'HIDDEN' &&
        r.recipientIdentity === 'HIDDEN' &&
        r.signature === 'HIDDEN' &&
        r.photos.mode === 'HIDDEN'
    )
}

function temAlgumaEvidencia(s: CompletionState): boolean {
    return preenchido(s.recipientTipo) || preenchido(s.nome) || preenchido(s.documento) || s.hasSignature || s.photoCount > 0
}

export function validateCompletion(
    requirements: FlowCompletionRequirements,
    state: CompletionState,
): CompletionValidation {
    const missing: string[] = []

    if (requirements.recipientType === 'REQUIRED' && !preenchido(state.recipientTipo)) {
        missing.push('quem recebeu')
    }

    if (requirements.recipientIdentity === 'REQUIRED' && !(preenchido(state.nome) && preenchido(state.documento))) {
        missing.push('nome e documento')
    }

    if (requirements.signature === 'REQUIRED' && !state.hasSignature) {
        missing.push('assinatura')
    }

    if (requirements.photos.mode === 'REQUIRED' && state.photoCount < requirements.photos.min) {
        missing.push(requirements.photos.min > 1 ? `${requirements.photos.min} fotos` : 'foto')
    }

    if (missing.length > 0) return { canProceed: false, missing }

    // Nada obrigatorio faltando. Sobra a trava do caso oco: tela sem campo
    // nenhum, sem formulario vinculado e sem nada registrado.
    if (tudoOculto(requirements) && !state.hasLinkedForm && !temAlgumaEvidencia(state)) {
        return { canProceed: false, missing: [], blockMessage: MSG_SEM_EVIDENCIA }
    }

    return { canProceed: true, missing }
}
