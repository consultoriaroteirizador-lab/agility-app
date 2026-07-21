import type { OrderOccurrenceReasonResponse } from '@/domain/agility/order-occurrence-reason/dto'

import { storage } from './storage'

/**
 * Local mirror of the backend order-occurrence-reasons catalog. Used as an
 * offline fallback when the failure flow can't reach the API (Task 3 reads
 * this when `reasons.length === 0 && isError`).
 */
const KEY = 'occurrence-reasons:cache'

export async function saveOccurrenceReasonsMirror(reasons: OrderOccurrenceReasonResponse[]): Promise<void> {
    try {
        await storage.setItem(KEY, reasons)
    } catch {
        // best-effort
    }
}

export async function loadOccurrenceReasonsMirror(): Promise<OrderOccurrenceReasonResponse[] | null> {
    try {
        return await storage.getItem<OrderOccurrenceReasonResponse[]>(KEY)
    } catch {
        return null
    }
}
