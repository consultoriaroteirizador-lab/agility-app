import type { RouteNonDeliveredItemResponse } from '@/domain/agility/routing/dto'

import type { Parada } from '../../_types/rota.types'
import { buildInsucessoList, outcomeLabel } from '../routeNonDelivered'

// Fábrica mínima de Parada de insucesso ao vivo (só os campos que o merge usa).
function makeParada(over: Partial<Parada> & { serviceId: string }): Parada {
    return {
        numero: 1,
        nome: 'Cliente Ao Vivo',
        endereco: 'Rua Ao Vivo, 100',
        horarioInicio: '--:--',
        horarioFim: '--:--',
        tipo: 'Entrega',
        status: 'concluida-insucesso',
        ...over,
    } as Parada
}

function makeLedger(
    over: Partial<RouteNonDeliveredItemResponse> & { serviceId: string },
): RouteNonDeliveredItemResponse {
    return {
        serviceCode: 'COD-000',
        recipientName: 'Cliente Ledger',
        address: 'Rua Ledger, 200',
        kind: 'ORDER_FAILURE',
        outcome: 'FAILED',
        reasonName: 'Motivo Padrão',
        currentStatus: null,
        occurredAt: '2026-07-21T12:00:00.000Z',
        ...over,
    }
}

describe('outcomeLabel', () => {
    it('mapeia cada desfecho para o rótulo em português', () => {
        expect(outcomeLabel('CANCELED')).toBe('Cancelado')
        expect(outcomeLabel('RETURNED_TO_POOL')).toBe('Voltou para a fila')
        expect(outcomeLabel('FAILED')).toBe('Insucesso')
    })

    it('cai para Insucesso em null/indefinido (legado)', () => {
        expect(outcomeLabel(null)).toBe('Insucesso')
        expect(outcomeLabel(undefined)).toBe('Insucesso')
    })
})

describe('buildInsucessoList', () => {
    it('inclui um pedido CANCELADO que só existe no ledger (saiu da rota)', () => {
        const ledger = [
            makeLedger({
                serviceId: 's-cancel',
                serviceCode: 'COD-CANCEL',
                recipientName: 'Cliente Cancelado',
                address: 'Rua Cancelada, 1',
                kind: 'ORDER_CANCELLATION',
                outcome: 'CANCELED',
                reasonName: 'Cliente desistiu',
            }),
        ]

        const rows = buildInsucessoList([], ledger)

        expect(rows).toHaveLength(1)
        expect(rows[0]).toMatchObject({
            serviceId: 's-cancel',
            code: 'COD-CANCEL',
            recipientName: 'Cliente Cancelado',
            address: 'Rua Cancelada, 1',
            outcome: 'CANCELED',
            reasonName: 'Cliente desistiu',
        })
        expect(outcomeLabel(rows[0].outcome)).toBe('Cancelado')
    })

    it('inclui um pedido RETURNED_TO_POOL do ledger com o rótulo correto', () => {
        const rows = buildInsucessoList(
            [],
            [makeLedger({ serviceId: 's-pool', outcome: 'RETURNED_TO_POOL', reasonName: 'Sem acesso' })],
        )
        expect(rows).toHaveLength(1)
        expect(rows[0].outcome).toBe('RETURNED_TO_POOL')
        expect(rows[0].reasonName).toBe('Sem acesso')
        expect(outcomeLabel(rows[0].outcome)).toBe('Voltou para a fila')
    })

    it('deduplica: parada FAILED ao vivo também no ledger aparece UMA vez com o motivo do ledger', () => {
        const live = [makeParada({ serviceId: 's-fail', nome: 'Cliente Ao Vivo', endereco: 'Rua Ao Vivo, 100' })]
        const ledger = [
            makeLedger({
                serviceId: 's-fail',
                outcome: 'FAILED',
                reasonName: 'Endereço não encontrado',
                recipientName: 'Cliente Ledger',
                address: 'Rua Ledger, 200',
            }),
        ]

        const rows = buildInsucessoList(live, ledger)

        expect(rows).toHaveLength(1)
        // Ledger vence para desfecho/motivo...
        expect(rows[0].outcome).toBe('FAILED')
        expect(rows[0].reasonName).toBe('Endereço não encontrado')
        // ...mas a parada ao vivo vence para recipientName/address.
        expect(rows[0].recipientName).toBe('Cliente Ao Vivo')
        expect(rows[0].address).toBe('Rua Ao Vivo, 100')
    })

    it('mantém uma parada de insucesso ao vivo que NÃO está no ledger (borda/legado)', () => {
        const live = [makeParada({ serviceId: 's-legacy', nome: 'Legado', endereco: 'Rua Legado, 9' })]

        const rows = buildInsucessoList(live, [])

        expect(rows).toHaveLength(1)
        expect(rows[0]).toMatchObject({
            serviceId: 's-legacy',
            recipientName: 'Legado',
            address: 'Rua Legado, 9',
            outcome: null,
            reasonName: null,
        })
        // Sem desfecho → rótulo cai para Insucesso.
        expect(outcomeLabel(rows[0].outcome)).toBe('Insucesso')
    })

    it('combina os três casos numa lista única deduplicada', () => {
        const live = [
            makeParada({ serviceId: 's-fail' }),
            makeParada({ serviceId: 's-legacy' }),
        ]
        const ledger = [
            makeLedger({ serviceId: 's-fail', outcome: 'FAILED', reasonName: 'X' }),
            makeLedger({ serviceId: 's-cancel', outcome: 'CANCELED', reasonName: 'Y' }),
        ]

        const rows = buildInsucessoList(live, ledger)
        const ids = rows.map(r => r.serviceId)

        expect(ids).toHaveLength(3)
        expect(new Set(ids).size).toBe(3)
        expect(ids).toEqual(expect.arrayContaining(['s-fail', 's-legacy', 's-cancel']))
    })
})
