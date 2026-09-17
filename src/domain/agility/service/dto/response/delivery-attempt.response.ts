/**
 * Uma tentativa de entrega (GET /services/:id/attempts).
 *
 * A resposta do backend traz MAIS campos do que os declarados aqui — entre eles
 * `driverName` e `failedBy`, que o app NÃO exibe por decisão de produto (D1 da
 * spec da Parte 2): o motorista vê o que houve na porta, não quem tentou.
 * Declarar só o que a tela usa deixa essa decisão visível no tipo.
 */
export interface DeliveryAttemptResponse {
    id: string

    /** 1, 2, 3... na ordem das tentativas do pedido. */
    attemptNumber: number

    /** Limite congelado na falha. Ausente em backend anterior à exposição do campo. */
    maxAttempts?: number | null

    /** ISO. Quando a falha foi registrada. */
    failedAt: string

    /** Nome do motivo do catálogo, congelado. */
    reasonName: string | null

    /** Observação escrita pelo motorista. */
    notes: string | null

    /** URLs das fotos anexadas à ocorrência. */
    photoProof: string[]

    /** Desfecho: AWAITING_RETURN | REQUEUED | FAILED_FINAL. */
    outcome: string

    /** ISO da devolução, quando já fechada. */
    returnedAt: string | null

    /** Nome do CD onde a mercadoria foi devolvida, quando houver. */
    returnedFacilityName: string | null
}
