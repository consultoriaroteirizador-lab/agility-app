export type OccurrenceOutcome = 'CANCELED' | 'PENDING' | 'FAILED_LIMIT' | 'FAILED'

export interface ApplyOccurrenceRequest {
    occurrenceReasonId: string
    note?: string
    photoProof?: string[]
}
