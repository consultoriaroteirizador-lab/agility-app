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

        expect(mockedStorage.setItem).toHaveBeenCalledWith('occurrence-reasons:cache', REASONS)
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
})
