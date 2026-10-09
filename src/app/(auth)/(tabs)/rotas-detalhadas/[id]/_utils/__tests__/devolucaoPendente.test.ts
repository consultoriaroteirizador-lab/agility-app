import type { PendingReturnResponse } from '@/domain/agility/routing/routingAPI'

import { buildDevolucaoList, devolucaoDesfechoLabel, devolucaoInstrucao, textoConcluirRota } from '../devolucaoPendente'

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

// Rodada de 09/10/2026: rota sem parada de retorno dizia "Entregue na parada de retorno" e
// concluía sem avisar que a mercadoria continuava com a motorista. Decisão: avisar e deixar
// concluir. Concluir a rota sem parada de retorno registra a devolução no CD da rota
// (back: resolveAwaitingAttemptsOfRouting, ROUTE_COMPLETED); a central não confirma depois.
describe('devolucaoInstrucao', () => {
    it('com parada de retorno, manda entregar lá', () => {
        expect(devolucaoInstrucao(1, true)).toBe('Esta mercadoria ainda está com você. Entregue na parada de retorno.')
        expect(devolucaoInstrucao(2, true)).toBe('Estas mercadorias ainda estão com você. Entregue na parada de retorno.')
    })

    it('sem parada de retorno, manda devolver na base', () => {
        expect(devolucaoInstrucao(1, false)).toBe(
            'Esta mercadoria ainda está com você. Devolva no CD antes de concluir a rota: ao concluir, a devolução fica registrada.',
        )
        expect(devolucaoInstrucao(3, false)).toBe(
            'Estas mercadorias ainda estão com você. Devolva no CD antes de concluir a rota: ao concluir, a devolução fica registrada.',
        )
    })
})

describe('textoConcluirRota', () => {
    it('sem nada a devolver, mantém a confirmação de sempre', () => {
        expect(textoConcluirRota([], false)).toBe('Deseja realmente concluir esta rota? Esta ação não pode ser desfeita.')
    })

    it('com mercadoria a devolver, lista os pedidos e diz onde devolver', () => {
        expect(textoConcluirRota(['ETQ-1'], false)).toBe(
            'Você ainda está com 1 pedido para devolver: ETQ-1. Ao concluir, a devolução fica registrada no CD. Já entregou a mercadoria lá?',
        )
        expect(textoConcluirRota(['ETQ-1', 'ETQ-2'], true)).toBe(
            'Você ainda está com 2 pedidos para devolver: ETQ-1, ETQ-2. Entregue na parada de retorno. Concluir a rota mesmo assim?',
        )
    })
})
