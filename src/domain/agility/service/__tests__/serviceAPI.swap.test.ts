const mockGet = jest.fn()
const mockPost = jest.fn()
jest.mock('@/api/apiConfig', () => ({
    apiAgility: { get: (...a: unknown[]) => mockGet(...a), post: (...a: unknown[]) => mockPost(...a) },
}))

import { serviceAPI } from '../serviceAPI'

beforeEach(() => {
    mockGet.mockReset()
    mockPost.mockReset()
})

it('lookupEquipment consulta em /materials/equipment-lookup, com o código na query (o axios codifica)', async () => {
    mockGet.mockResolvedValue({ data: { success: true, result: { found: false, code: 'X 1/2' } } })

    await expect(serviceAPI.lookupEquipment('s1', 'X 1/2')).resolves.toEqual({ success: true, result: { found: false, code: 'X 1/2' } })

    expect(mockGet).toHaveBeenCalledWith('/services/s1/materials/equipment-lookup', { params: { code: 'X 1/2' } })
})

it('swapLine troca em /materials/:lineId/swap com o corpo', async () => {
    mockPost.mockResolvedValue({ data: { success: true, result: { replaced: { id: 'a' }, installed: { id: 'b' } } } })
    const corpo = { code: 'MOD-NOVO', serialNumber: 'SN-B', reason: 'não ligava' }

    await expect(serviceAPI.swapLine('s1', 'a', corpo)).resolves.toEqual({ success: true, result: { replaced: { id: 'a' }, installed: { id: 'b' } } })

    expect(mockPost).toHaveBeenCalledWith('/services/s1/materials/a/swap', corpo)
})
