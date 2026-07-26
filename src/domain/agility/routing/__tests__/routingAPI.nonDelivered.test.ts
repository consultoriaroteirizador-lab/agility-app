/**
 * Trava o contrato do ledger de não-entregues: a resposta VEM ENVELOPADA em
 * BaseResponse. A versão original lia `data` como se fosse array cru e caía num
 * `: []` silencioso — o app mostrava "Nenhuma parada marcada como insucesso"
 * mesmo com o backend devolvendo os pedidos cancelados.
 */

jest.mock('@/api/apiConfig', () => ({
    apiAgility: { get: jest.fn() },
}))

import { apiAgility } from '@/api/apiConfig'

import { routingAPI } from '../routingAPI'

const mockedGet = apiAgility.get as jest.Mock

const item = {
    serviceId: '96e1ecee-fc54-4e42-9f5a-4634ebfc58f8',
    serviceCode: null,
    recipientName: null,
    address: 'Avenida Adhemar de Barros, 1043 - São José dos Campos/SP',
    kind: 'ORDER_CANCELLATION',
    outcome: 'CANCELED',
    reasonName: 'Recusado',
    currentStatus: 'CANCELED',
    occurredAt: '2026-07-26T02:29:17.732Z',
}

describe('routingAPI.findNonDelivered', () => {
    beforeEach(() => mockedGet.mockReset())

    it('desempacota o array de dentro de BaseResponse.result (formato real do backend)', async () => {
        mockedGet.mockResolvedValue({
            data: { success: true, message: null, result: [item], error: null },
        })

        const result = await routingAPI.findNonDelivered('rota-1')

        expect(result).toHaveLength(1)
        expect(result[0].serviceId).toBe(item.serviceId)
        expect(result[0].outcome).toBe('CANCELED')
    })

    it('chama o endpoint da rota informada', async () => {
        mockedGet.mockResolvedValue({ data: { success: true, result: [], error: null } })

        await routingAPI.findNonDelivered('rota-42')

        expect(mockedGet).toHaveBeenCalledWith('/routings/rota-42/non-delivered')
    })

    it('devolve [] quando result vem vazio', async () => {
        mockedGet.mockResolvedValue({ data: { success: true, result: [], error: null } })

        await expect(routingAPI.findNonDelivered('rota-1')).resolves.toEqual([])
    })

    it('devolve [] quando result vem null/ausente, sem estourar', async () => {
        mockedGet.mockResolvedValue({ data: { success: true, result: null, error: null } })
        await expect(routingAPI.findNonDelivered('rota-1')).resolves.toEqual([])

        mockedGet.mockResolvedValue({ data: {} })
        await expect(routingAPI.findNonDelivered('rota-1')).resolves.toEqual([])
    })
})
