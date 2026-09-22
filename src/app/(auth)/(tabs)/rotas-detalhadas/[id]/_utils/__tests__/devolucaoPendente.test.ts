import type { PendingReturnResponse } from '@/domain/agility/routing/routingAPI'

import { buildDevolucaoList, devolucaoDesfechoLabel } from '../devolucaoPendente'

function pendencia(over: Partial<PendingReturnResponse> & { serviceId: string }): PendingReturnResponse {
    return {
        serviceCode: null,
        title: null,
        serviceStatus: null,
        reasonName: null,
        sideEffect: 'FAIL_ORDER',
        attemptNumber: 1,
        maxAttempts: 3,
        ...over,
    }
}

describe('devolucaoDesfechoLabel', () => {
    it('separa o cancelamento da central da entrega não realizada', () => {
        expect(devolucaoDesfechoLabel('CANCEL_ORDER')).toBe('Cancelado pela central')
        expect(devolucaoDesfechoLabel('FAIL_ORDER')).toBe('Entrega não realizada')
        expect(devolucaoDesfechoLabel('RETURN_TO_POOL')).toBe('Entrega não realizada')
    })

    it('cai no rótulo genérico para efeito desconhecido ou ausente', () => {
        expect(devolucaoDesfechoLabel('EFEITO_NOVO')).toBe('Devolver ao CD')
        expect(devolucaoDesfechoLabel(null)).toBe('Devolver ao CD')
    })
})

describe('buildDevolucaoList', () => {
    it('marca como fora da rota o pedido cancelado que não tem mais parada', () => {
        const rows = buildDevolucaoList(
            [pendencia({ serviceId: 'cancelado-1', sideEffect: 'CANCEL_ORDER' })],
            ['outro-pedido'],
        )

        expect(rows).toHaveLength(1)
        expect(rows[0].foraDaRota).toBe(true)
        expect(rows[0].desfecho).toBe('Cancelado pela central')
    })

    it('não marca como fora da rota o pedido falhado que continua sendo parada', () => {
        const rows = buildDevolucaoList([pendencia({ serviceId: 's-1' })], ['s-1', 's-2'])

        expect(rows[0].foraDaRota).toBe(false)
    })

    it('usa o código da etiqueta e cai para o título quando não há código', () => {
        const rows = buildDevolucaoList(
            [
                pendencia({ serviceId: 'a', serviceCode: 'PED-1', title: 'Mercado' }),
                pendencia({ serviceId: 'b', serviceCode: null, title: 'Mercado' }),
                pendencia({ serviceId: 'c', serviceCode: null, title: null }),
            ],
            [],
        )

        expect(rows.map((r) => r.titulo)).toEqual(['PED-1', 'Mercado', 'Pedido devolvido'])
    })

    it('mostra a contagem de tentativas só quando o limite veio do backend', () => {
        const rows = buildDevolucaoList(
            [
                pendencia({ serviceId: 'a', attemptNumber: 2, maxAttempts: 3 }),
                pendencia({ serviceId: 'b', attemptNumber: 1, maxAttempts: 0 }),
            ],
            [],
        )

        expect(rows[0].tentativa).toBe('Tentativa 2 de 3')
        expect(rows[1].tentativa).toBeNull()
    })

    it('preserva a ordem do backend e descarta pendência sem serviceId', () => {
        const rows = buildDevolucaoList(
            [
                pendencia({ serviceId: 'primeiro' }),
                { ...pendencia({ serviceId: 'x' }), serviceId: '' },
                pendencia({ serviceId: 'segundo' }),
            ],
            [],
        )

        expect(rows.map((r) => r.serviceId)).toEqual(['primeiro', 'segundo'])
    })

    it('leva o motivo congelado da ocorrência quando houver', () => {
        const rows = buildDevolucaoList(
            [pendencia({ serviceId: 'a', reasonName: 'Recusado pelo cliente' })],
            [],
        )

        expect(rows[0].motivo).toBe('Recusado pelo cliente')
    })
})
