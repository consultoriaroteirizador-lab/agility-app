/**
 * Decide qual das tres etapas finais renderizar, dada a config da empresa.
 *
 * Os quatro fluxos (entrega, coleta, servico, transferencia) tem condicoes
 * proprias de "ja terminei os checks" — cada um passa a sua em `readyAfterChecks`.
 * Da porta da etapa de recebedor em diante, a decisao e desta funcao, e so dela:
 * ocultar uma etapa sem alguem assumir o lugar dela prende o motorista no
 * fallback da tela.
 *
 * Devolve `null` quando nenhuma etapa final se aplica ainda — a tela segue com
 * as suas proprias etapas iniciais.
 */
import { FlowCompletionRequirements } from '@/domain/agility/company/completionRequirements'

export type CompletionStep = 'recipient' | 'data' | 'final' | null

export interface CompletionStepInput {
    /** Etapa numerica do ParadaContext. */
    etapa: number
    /** A tela ja passou pelos checks proprios dela (itens, formulario, retorno). */
    readyAfterChecks: boolean
    /** O motorista ja escolheu quem recebeu. */
    hasRecipientType: boolean
    requirements: FlowCompletionRequirements
}

/** A tela de dados so existe se pelo menos um dos itens dela aparecer. */
function hasDataStep(r: FlowCompletionRequirements): boolean {
    return r.recipientIdentity !== 'HIDDEN' || r.signature !== 'HIDDEN' || r.photos.mode !== 'HIDDEN'
}

export function resolveCompletionStep({
    etapa,
    readyAfterChecks,
    hasRecipientType,
    requirements,
}: CompletionStepInput): CompletionStep {
    if (etapa === 5) return 'final'

    const showRecipient = requirements.recipientType !== 'HIDDEN'
    const showData = hasDataStep(requirements)

    // Nada do fluxo final se aplica ainda: a tela cuida das etapas dela.
    if (!readyAfterChecks && etapa < 3) return null

    if (showRecipient && !hasRecipientType) return 'recipient'
    if (showRecipient && etapa === 3) return 'recipient'

    if (showData) return 'data'

    // Sem recebedor e sem dados, nao sobra tela nenhuma: vai concluir.
    return 'final'
}
