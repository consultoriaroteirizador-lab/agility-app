export interface RoutingHandoffProof {
    receivedBy: string
    photoProof?: string[]
    signature?: string
    notes?: string
}

export interface RoutingHandoffItem {
    serviceId: string
    outcome: 'RECEIVED' | 'NOT_RECEIVED'
    reason?: string
    notes?: string
}

export interface RoutingHandoffRequest {
    proof: RoutingHandoffProof
    /** Subconjunto do lote (futuro palete/pedido). Omitido = lote inteiro. */
    serviceIds?: string[]
    /** Conferência por pedido (Fase 2). Omitido = lote inteiro recebido (backward-compat). */
    items?: RoutingHandoffItem[]
}

export interface RoutingHandoffResult {
    handoffId: string
    facilityId: string
    arrivingLegRoutingId: string
    arrivedCount: number
    nextLegRoutingId?: string | null
    departedCount?: number
    /** Trecho foi concluído no handoff (sem retorno). Ausente = degradou no back. */
    legCompleted?: boolean
    /** Quando o trecho tem retorno: id do Service RETURN pra abrir o check-in. */
    returnServiceId?: string | null
}
