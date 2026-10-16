const mockGet = jest.fn()
const mockPatch = jest.fn()
jest.mock('@/api/apiConfig', () => ({
    apiAgility: { get: (...a: unknown[]) => mockGet(...a), patch: (...a: unknown[]) => mockPatch(...a) },
}))

import { ServiceType } from '../dto/types'
import { serviceAPI } from '../serviceAPI'
import { serviceService } from '../serviceService'

beforeEach(() => {
    mockGet.mockReset()
    mockPatch.mockReset()
})

const FAMILIAS = [
    [ServiceType.DELIVERY, 'items'],
    [ServiceType.PICKUP, 'items'],
    [ServiceType.TRANSFER, 'items'],
    [ServiceType.RETURN, 'items'],
    [null, 'items'],
    [ServiceType.SERVICE, 'materials'],
] as const

it.each(FAMILIAS)('getLines de %s busca em /services/:id/%s e devolve o envelope', async (serviceType, rota) => {
    mockGet.mockResolvedValue({ data: { success: true, result: [{ id: 'l1' }] } })
    await expect(serviceAPI.getLines('s1', serviceType)).resolves.toEqual({ success: true, result: [{ id: 'l1' }] })
    expect(mockGet).toHaveBeenCalledWith(`/services/s1/${rota}`)
})

it.each(FAMILIAS)('checkLine de %s confere em /services/:id/%s/:lineId/check com o corpo de hoje', async (serviceType, rota) => {
    mockPatch.mockResolvedValue({ data: { success: true, result: { materialId: 'l9' } } })
    const corpo = { status: 'DAMAGED' as const, actualQuantity: 1, notes: 'amassado', photoProof: 'https://x/f.jpg' }
    await serviceAPI.checkLine('s1', serviceType, 'l9', corpo)
    expect(mockPatch).toHaveBeenCalledWith(`/services/s1/${rota}/l9/check`, corpo)
})

// Fase 4 (épico itens do pedido): o app não escreve linhas; o caminho de escrita morto saiu.
it.each(['create', 'createBatch', 'update'])('serviceAPI e serviceService não expõem %s', (nome) => {
    expect(serviceAPI).not.toHaveProperty(nome)
    expect(serviceService).not.toHaveProperty(nome)
})
