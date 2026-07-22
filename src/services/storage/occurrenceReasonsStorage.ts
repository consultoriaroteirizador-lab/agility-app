import type { OrderOccurrenceReasonResponse } from '@/domain/agility/order-occurrence-reason/dto'

import { storage } from './storage'

/**
 * Local mirror of the backend order-occurrence-reasons catalog. Used as an
 * offline fallback when the failure flow can't reach the API (Task 3 reads
 * this when `reasons.length === 0 && isError`).
 */
const KEY_PREFIX = 'occurrence-reasons:cache'

type OccurrenceContext = 'TRANSFER' | 'LAST_MILE' | 'SERVICE'

function mirrorKey(context?: OccurrenceContext): string {
    return `${KEY_PREFIX}:${context ?? 'all'}`
}

export async function saveOccurrenceReasonsMirror(reasons: OrderOccurrenceReasonResponse[], context?: OccurrenceContext): Promise<void> {
    try {
        await storage.setItem(mirrorKey(context), reasons)
    } catch {
        // best-effort
    }
}

export async function loadOccurrenceReasonsMirror(context?: OccurrenceContext): Promise<OrderOccurrenceReasonResponse[] | null> {
    try {
        return await storage.getItem<OrderOccurrenceReasonResponse[]>(mirrorKey(context))
    } catch {
        return null
    }
}
