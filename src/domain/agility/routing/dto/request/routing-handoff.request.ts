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
}
