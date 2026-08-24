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

    if (showRecipient && !hasRecipientType) {
        // REQUIRED sempre forca a escolha, em qualquer etapa. OPTIONAL so
        // insiste enquanto o motorista ainda nao passou pela etapa (etapa < 4,
        // a etapa que so existe depois de sair do recebedor) — passado esse
        // ponto ele ja teve a chance e pode seguir sem escolher; a config
        // dizia "opcional" e nao pode virar "obrigatorio" na pratica.
        if (requirements.recipientType === 'REQUIRED') return 'recipient'
        if (requirements.recipientType === 'OPTIONAL' && etapa < 4) return 'recipient'
    }
    if (showRecipient && etapa === 3) return 'recipient'

    if (showData) return 'data'

    // Sem recebedor e sem dados, nao sobra tela nenhuma: vai concluir.
    return 'final'
}

export interface PreviousStepInput {
    /** De qual tela final o motorista esta voltando. */
    from: 'data' | 'final'
    requirements: FlowCompletionRequirements
}

export interface PreviousStepResult {
    /** Etapa para onde `setEtapa` deve apontar. */
    etapa: number
    /**
     * Quando true, quem chama tambem precisa `setDelivered(false)` — a volta
     * saiu de todas as etapas finais e devolveu o motorista ao ponto de
     * decisao (etapa 2). Sem isso `delivered` fica preso em `true` e o
     * roteador nunca mais devolve a tela de confirmacao.
     */
    resetDelivered: boolean
}

/**
 * Espelho de `resolveCompletionStep` para o botao de VOLTAR. A ida virou
 * config-driven (etapas ocultas somem do caminho); a volta tinha ficado com
 * etapa numerica fixa (`setEtapa(3)`, `setEtapa(4)`), pressupondo que essas
 * etapas sempre existem. Quando a empresa oculta o recebedor (ou tudo), essas
 * etapas nao existem mais e o motorista fica girando na mesma tela.
 */
export function resolvePreviousStep({ from, requirements }: PreviousStepInput): PreviousStepResult {
    const showRecipient = requirements.recipientType !== 'HIDDEN'
    const showData = hasDataStep(requirements)

    if (from === 'final' && showData) return { etapa: 4, resetDelivered: false }
    if ((from === 'final' || from === 'data') && showRecipient) return { etapa: 3, resetDelivered: false }

    // Nem recebedor nem dados: nao ha etapa final anterior para onde voltar —
    // volta ao ponto de decisao (etapa 2) e reabre a pergunta.
    return { etapa: 2, resetDelivered: true }
}
