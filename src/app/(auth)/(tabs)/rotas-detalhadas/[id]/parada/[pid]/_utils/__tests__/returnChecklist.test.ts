import type { PendingReturnResponse, ReturnManifestItem } from '@/domain/agility/routing/routingAPI'

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

function makePendencia(over: Partial<PendingReturnResponse> & { serviceId: string }): PendingReturnResponse {
    return {
        serviceCode: null,
        title: 'Pedido TRA-1',
        serviceStatus: 'FAILED',
        reasonName: 'Cliente ausente',
        sideEffect: 'FAIL_ORDER',
        attemptNumber: 1,
        maxAttempts: 3,
        ...over,
    }
}

describe('montarReturnChecklist', () => {
    it('mantem os itens do manifesto com a quantidade recebida e o check', () => {
        const result = montarReturnChecklist({
            items: [makeItem({ serviceId: 's-1' })],
            conferred: { 0: true },
            receivedQty: () => 2,
            pendentes: [],
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
            pendentes: [makePendencia({ serviceId: 's-2' })],
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
            pendentes: [makePendencia({ serviceId: 's-3', title: null })],
            pedidoConferred: {},
        })

        expect(result[0].material).toBe('Pedido devolvido')
    })

    it('manda o pedido nao conferido com checked false (o backend ignora)', () => {
        const result = montarReturnChecklist({
            items: [],
            conferred: {},
            receivedQty: () => 0,
            pendentes: [makePendencia({ serviceId: 's-4' })],
            pedidoConferred: {},
        })

        expect(result[0].checked).toBe(false)
    })

    it('nao duplica pedido que ja aparece no manifesto', () => {
        const result = montarReturnChecklist({
            items: [makeItem({ serviceId: 's-5' })],
            conferred: { 0: true },
            receivedQty: () => 3,
            pendentes: [makePendencia({ serviceId: 's-5' })],
            pedidoConferred: { 's-5': true },
        })

        expect(result).toHaveLength(1)
        expect(result[0].material).toBe('Caixa 10kg')
    })

    it('cartao de pedido cancelado entra igual, com o rotulo proprio', () => {
        const result = montarReturnChecklist({
            items: [],
            conferred: {},
            receivedQty: () => 0,
            pendentes: [makePendencia({
                serviceId: 's-9', serviceCode: 'ABC-9', title: 'Entrega 9', serviceStatus: 'CANCELED',
                reasonName: 'Recusado', sideEffect: 'CANCEL_ORDER',
            })],
            pedidoConferred: { 's-9': true },
        })

        expect(result).toEqual([{
            material: 'ABC-9',
            serviceId: 's-9',
            serviceCode: 'ABC-9',
            quantity: 0,
            unit: null,
            origin: 'UNDELIVERED',
            reason: 'FAILED',
            received: 0,
            checked: true,
        }])
    })

    // O `material` prefere o CÓDIGO: a pendência traz o que o manifesto mostra na
    // etiqueta, e é o que o motorista lê na caixa.
    it('sem codigo cai no titulo, e sem titulo no rotulo padrao', () => {
        const semCodigo = montarReturnChecklist({
            items: [], conferred: {}, receivedQty: () => 0,
            pendentes: [makePendencia({ serviceId: 's-6', serviceCode: null, title: 'Entrega 6' })],
            pedidoConferred: {},
        })
        expect(semCodigo[0].material).toBe('Entrega 6')

        const semNada = montarReturnChecklist({
            items: [], conferred: {}, receivedQty: () => 0,
            pendentes: [makePendencia({ serviceId: 's-7', serviceCode: null, title: null })],
            pedidoConferred: {},
        })
        expect(semNada[0].material).toBe('Pedido devolvido')
    })
})
