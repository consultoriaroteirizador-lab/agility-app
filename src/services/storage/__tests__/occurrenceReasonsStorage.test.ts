import type { OrderOccurrenceReasonResponse } from '@/domain/agility/order-occurrence-reason/dto'

import { loadOccurrenceReasonsMirror, saveOccurrenceReasonsMirror } from '../occurrenceReasonsStorage'
import { storage } from '../storage'

jest.mock('../storage', () => ({
    storage: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
    },
}))

const mockedStorage = storage as jest.Mocked<typeof storage>

const REASONS: OrderOccurrenceReasonResponse[] = [
    { id: '1', name: 'Endereço não encontrado', sideEffect: 'RETURN_TO_POOL', active: true },
    { id: '2', name: 'Cliente cancelou', description: 'Cliente pediu cancelamento', sideEffect: 'CANCEL_ORDER', active: true },
]

describe('occurrenceReasonsStorage', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('saves the mirror through the storage abstraction using the expected key', async () => {
        mockedStorage.setItem.mockResolvedValueOnce(undefined)

        await saveOccurrenceReasonsMirror(REASONS)

        expect(mockedStorage.setItem).toHaveBeenCalledWith('occurrence-reasons:cache:all', REASONS)
    })

    it('round-trips save -> load returning the same list', async () => {
        let stored: unknown = null
        mockedStorage.setItem.mockImplementation(async (_key: string, value: unknown) => {
            stored = value
        })
        mockedStorage.getItem.mockImplementation(async () => stored as OrderOccurrenceReasonResponse[] | null)

        await saveOccurrenceReasonsMirror(REASONS)
        const loaded = await loadOccurrenceReasonsMirror()

        expect(loaded).toEqual(REASONS)
    })

    it('loadOccurrenceReasonsMirror returns null when nothing was ever saved', async () => {
        mockedStorage.getItem.mockResolvedValueOnce(null)

        const loaded = await loadOccurrenceReasonsMirror()

        expect(loaded).toBeNull()
    })

    it('save is best-effort: swallows storage errors instead of throwing', async () => {
        mockedStorage.setItem.mockRejectedValueOnce(new Error('AsyncStorage unavailable'))

        await expect(saveOccurrenceReasonsMirror(REASONS)).resolves.toBeUndefined()
    })

    it('load is best-effort: returns null when storage throws', async () => {
        mockedStorage.getItem.mockRejectedValueOnce(new Error('AsyncStorage unavailable'))

        const loaded = await loadOccurrenceReasonsMirror()

        expect(loaded).toBeNull()
    })

    it('saves the mirror under a context-scoped key', async () => {
        mockedStorage.setItem.mockResolvedValueOnce(undefined)

        await saveOccurrenceReasonsMirror(REASONS, 'TRANSFER')

        expect(mockedStorage.setItem).toHaveBeenCalledWith('occurrence-reasons:cache:TRANSFER', REASONS)
    })

    it('round-trips save -> load for a given context', async () => {
        const store = new Map<string, unknown>()
        mockedStorage.setItem.mockImplementation(async (key: string, value: unknown) => {
            store.set(key, value)
        })
        mockedStorage.getItem.mockImplementation(async (key: string) => (store.get(key) as OrderOccurrenceReasonResponse[] | undefined) ?? null)

        await saveOccurrenceReasonsMirror(REASONS, 'TRANSFER')
        const loaded = await loadOccurrenceReasonsMirror('TRANSFER')

        expect(loaded).toEqual(REASONS)
    })

    it('different contexts do not collide with each other or with the default key', async () => {
        const store = new Map<string, unknown>()
        mockedStorage.setItem.mockImplementation(async (key: string, value: unknown) => {
            store.set(key, value)
        })
        mockedStorage.getItem.mockImplementation(async (key: string) => (store.get(key) as OrderOccurrenceReasonResponse[] | undefined) ?? null)

        const TRANSFER_REASONS = [REASONS[0]]
        const LAST_MILE_REASONS = [REASONS[1]]

        await saveOccurrenceReasonsMirror(REASONS) // no context -> ...:all
        await saveOccurrenceReasonsMirror(TRANSFER_REASONS, 'TRANSFER')
        await saveOccurrenceReasonsMirror(LAST_MILE_REASONS, 'LAST_MILE')

        expect(await loadOccurrenceReasonsMirror()).toEqual(REASONS)
        expect(await loadOccurrenceReasonsMirror('TRANSFER')).toEqual(TRANSFER_REASONS)
        expect(await loadOccurrenceReasonsMirror('LAST_MILE')).toEqual(LAST_MILE_REASONS)
        expect(store.size).toBe(3)
    })
})
