import type { ServicePointResponse } from '@/domain/agility/routing/dto'
import type { ReturnManifestItem } from '@/domain/agility/routing/routingAPI'

import { montarReturnChecklist } from '../returnChecklist'

function makeItem(over: Partial<ReturnManifestItem> & { serviceId: string }): ReturnManifestItem {
    return {
        material: 'Caixa 10kg',
        sku: null,
        unit: 'un',
        quantity: 3,
        origin: 'UNDELIVERED',
        reason: 'FAILED',
        serviceCode: 'COD-1',
        ...over,
    }
}

function makePedido(over: Partial<ServicePointResponse> & { id: string }): ServicePointResponse {
    return {
        sequenceOrder: 1,
        latitude: -23.5,
        longitude: -46.6,
        title: 'Pedido TRA-1',
        serviceType: 'DELIVERY',
        status: 'FAILED',
        ...over,
    } as ServicePointResponse
}

describe('montarReturnChecklist', () => {
    it('mantem os itens do manifesto com a quantidade recebida e o check', () => {
        const result = montarReturnChecklist({
            items: [makeItem({ serviceId: 's-1' })],
            conferred: { 0: true },
            receivedQty: () => 2,
            pedidosVolta: [],
            pedidoConferred: {},
        })

        expect(result).toEqual([
            {
                material: 'Caixa 10kg',
                serviceId: 's-1',
                serviceCode: 'COD-1',
                quantity: 3,
                unit: 'un',
                origin: 'UNDELIVERED',
                reason: 'FAILED',
                received: 2,
                checked: true,
            },
        ])
    })

    it('acrescenta o pedido sem linha de manifesto com quantidade zero e material do titulo', () => {
        const result = montarReturnChecklist({
            items: [],
            conferred: {},
            receivedQty: () => 0,
            pedidosVolta: [makePedido({ id: 's-2' })],
            pedidoConferred: { 's-2': true },
        })

        expect(result).toEqual([
            {
                material: 'Pedido TRA-1',
                serviceId: 's-2',
                serviceCode: null,
                quantity: 0,
                unit: null,
                origin: 'UNDELIVERED',
                reason: 'FAILED',
                received: 0,
                checked: true,
            },
        ])
    })

    it('usa um rotulo padrao quando o pedido nao tem titulo', () => {
        const result = montarReturnChecklist({
            items: [],
            conferred: {},
            receivedQty: () => 0,
            pedidosVolta: [makePedido({ id: 's-3', title: null })],
            pedidoConferred: {},
        })

        expect(result[0].material).toBe('Pedido devolvido')
    })

    it('manda o pedido nao conferido com checked false (o backend ignora)', () => {
        const result = montarReturnChecklist({
            items: [],
            conferred: {},
            receivedQty: () => 0,
            pedidosVolta: [makePedido({ id: 's-4' })],
            pedidoConferred: {},
        })

        expect(result[0].checked).toBe(false)
    })

    it('nao duplica pedido que ja aparece no manifesto', () => {
        const result = montarReturnChecklist({
            items: [makeItem({ serviceId: 's-5' })],
            conferred: { 0: true },
            receivedQty: () => 3,
            pedidosVolta: [makePedido({ id: 's-5' })],
            pedidoConferred: { 's-5': true },
        })

        expect(result).toHaveLength(1)
        expect(result[0].material).toBe('Caixa 10kg')
    })
})
