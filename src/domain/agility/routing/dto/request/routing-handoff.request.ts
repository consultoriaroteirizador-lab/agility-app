export interface RoutingHandoffProof {
    receivedBy: string
    photoProof?: string[]
    signature?: string
    notes?: string
}

export interface RoutingHandoffRequest {
    proof: RoutingHandoffProof
    /** Subconjunto do lote (futuro palete/pedido). Omitido = lote inteiro. */
    serviceIds?: string[]
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
