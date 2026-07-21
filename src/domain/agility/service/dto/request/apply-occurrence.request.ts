export type OccurrenceOutcome = 'CANCELED' | 'PENDING' | 'FAILED_LIMIT'

export interface ApplyOccurrenceRequest {
    occurrenceReasonId: string
    note?: string
    photoProof?: string[]
}
