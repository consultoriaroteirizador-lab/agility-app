/**
 * Rótulos das tentativas de entrega exibidas na parada.
 *
 * Mapa exaustivo com fallback: o backend valida os desfechos por CHECK no banco
 * (`ATTEMPT_OUTCOMES`), mas um valor novo não pode quebrar a tela do motorista.
 *
 * @module rotas-detalhadas/parada/utils/attemptLabels
 */

/** Desfecho da tentativa, como o backend o envia. */
export type AttemptOutcome = 'AWAITING_RETURN' | 'REQUEUED' | 'FAILED_FINAL'

export function outcomeTentativaLabel(outcome: string | null | undefined): string {
    switch (outcome) {
        case 'AWAITING_RETURN':
            return 'Aguardando devolucao ao CD'
        case 'REQUEUED':
            return 'Voltou para a fila'
        case 'FAILED_FINAL':
            return 'Insucesso definitivo'
        default:
            return 'Tentativa registrada'
    }
}

/**
 * "2a tentativa de 3". O limite só aparece quando o backend o envia — versão
 * anterior à exposição do campo devolve `maxAttempts` indefinido, e
 * "de undefined" na tela do motorista seria pior que a ordem sozinha.
 */
export function tentativaTitulo(attemptNumber: number, maxAttempts?: number | null): string {
    const base = `${attemptNumber}a tentativa`
    return maxAttempts && maxAttempts > 0 ? `${base} de ${maxAttempts}` : base
}
