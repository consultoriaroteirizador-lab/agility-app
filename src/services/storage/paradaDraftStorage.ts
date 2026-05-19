import AsyncStorage from '@react-native-async-storage/async-storage'

import type { ServiceDraftData } from '@/domain/agility/service/dto'

import { storage } from './storage'

/**
 * Local mirror of the backend Service.draftData. Holds an extra
 * `localUpdatedAt` timestamp used to decide which side wins on hydrate
 * (last-write-wins, server `draftUpdatedAt` vs this).
 */
export interface ParadaDraft extends ServiceDraftData {
    localUpdatedAt: number
}

const KEY_PREFIX = 'parada:draft:'

export function getParadaDraftKey(serviceId: string): string {
    return `${KEY_PREFIX}${serviceId}`
}

export async function loadParadaDraft(serviceId: string): Promise<ParadaDraft | null> {
    try {
        return await storage.getItem<ParadaDraft>(getParadaDraftKey(serviceId))
    } catch {
        return null
    }
}

export async function saveParadaDraft(serviceId: string, draft: ParadaDraft): Promise<void> {
    try {
        await storage.setItem(getParadaDraftKey(serviceId), draft)
    } catch {
        // AsyncStorage failures should never crash the UX; the backend
        // is the canonical source of truth.
    }
}

export async function clearParadaDraft(serviceId: string): Promise<void> {
    try {
        await storage.removeItem(getParadaDraftKey(serviceId))
    } catch {
        // best-effort
    }
}

/**
 * Drops every persisted draft whose serviceId is NOT in `activeServiceIds`.
 * Use after fetching the driver's active services on app open / route refresh.
 */
export async function clearStaleParadaDrafts(activeServiceIds: string[]): Promise<void> {
    try {
        const keys = await AsyncStorage.getAllKeys()
        const active = new Set(activeServiceIds)
        const stale = keys.filter(k => k.startsWith(KEY_PREFIX) && !active.has(k.slice(KEY_PREFIX.length)))
        if (stale.length > 0) {
            await AsyncStorage.multiRemove(stale)
        }
    } catch {
        // best-effort
    }
}
