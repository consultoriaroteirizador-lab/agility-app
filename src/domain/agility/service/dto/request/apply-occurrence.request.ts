export type OccurrenceOutcome = 'CANCELED' | 'PENDING' | 'FAILED_LIMIT' | 'FAILED'

export interface ApplyOccurrenceRequest {
    occurrenceReasonId: string
    note?: string
    photoProof?: string[]
    /**
     * GPS de onde a falha foi registrada (best-effort). Vai só o PAR completo —
     * o backend responde 400 para latitude sem longitude.
     */
    latitude?: number
    longitude?: number
    accuracy?: number
}
