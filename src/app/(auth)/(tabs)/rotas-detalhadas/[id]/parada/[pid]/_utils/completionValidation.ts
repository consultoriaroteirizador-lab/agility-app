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
}

export interface CompletionValidation {
    canProceed: boolean
    /** Rotulos do que falta, na ordem da tela. Vazio quando pode seguir. */
    missing: string[]
}

const preenchido = (v?: string | null) => !!v?.trim()

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

    return { canProceed: missing.length === 0, missing }
}
