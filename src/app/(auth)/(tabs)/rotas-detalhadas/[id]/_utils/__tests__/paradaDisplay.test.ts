/**
 * Derivações de EXIBIÇÃO da parada agrupada (§8 da spec).
 *
 * Os dois itens da lista de aceite que são texto puro na tela — o selo de notas
 * do card (`N notas` / `3 de 5 entregues`) e a linha de progresso (`X de Y
 * paradas · N de M notas`) — moravam dentro de componentes, e este repo não tem
 * teste de componente. Um refactor de `isGrupoMisto` ou da condição
 * `notasTotal > total` regredia em silêncio. Aqui a derivação é pura e coberta.
 */
import type { ServiceResponse } from '@/domain/agility/service/dto'

import type { ParadaStatus } from '../../_types/rota.types'
import { resolveNotasBadge, resolveProgressoTexto } from '../paradaDisplay'
import type { ParadaCountResult } from '../routeCalculations'

function nota(over: Partial<ServiceResponse> & { id: string }): ServiceResponse {
    return { isCompleted: false, ...over } as unknown as ServiceResponse
}

function paradaCom(status: ParadaStatus, pedidos: ServiceResponse[]) {
    return { status, pedidos }
}

function contagem(over: Partial<ParadaCountResult>): ParadaCountResult {
    return {
        total: 0,
        pendentes: 0,
        emAndamento: 0,
        concluidasSucesso: 0,
        concluidasInsucesso: 0,
        concluidas: 0,
        notasTotal: 0,
        notasConcluidas: 0,
        ...over,
    }
}

describe('resolveNotasBadge — selo de notas do card da parada', () => {
    it('parada de 1 nota não exibe selo (comportamento idêntico ao de antes do agrupamento)', () => {
        const badge = resolveNotasBadge(paradaCom('pendente', [nota({ id: 'a' })]))
        expect(badge.totalNotas).toBe(1)
        expect(badge.label).toBeNull()
    })

    it('5 notas na mesma porta → "5 notas"', () => {
        const badge = resolveNotasBadge(
            paradaCom('pendente', [0, 1, 2, 3, 4].map((i) => nota({ id: `n${i}` }))),
        )
        expect(badge.totalNotas).toBe(5)
        expect(badge.isGrupoMisto).toBe(false)
        expect(badge.label).toBe('5 notas')
    })

    it('grupo MISTO (3 entregues, 2 insucesso) → "3 de 5 entregues" (§3.3)', () => {
        const pedidos = [
            nota({ id: 'a', isCompleted: true }),
            nota({ id: 'b', isCompleted: true }),
            nota({ id: 'c', isCompleted: true }),
            nota({ id: 'd', isFailed: true }),
            nota({ id: 'e', isFailed: true }),
        ]
        const badge = resolveNotasBadge(paradaCom('concluida-insucesso', pedidos))
        expect(badge.notasEntregues).toBe(3)
        expect(badge.isGrupoMisto).toBe(true)
        expect(badge.label).toBe('3 de 5 entregues')
    })

    it('insucesso TOTAL (0 entregues) não é misto → volta ao selo de contagem', () => {
        const pedidos = [nota({ id: 'a', isFailed: true }), nota({ id: 'b', isFailed: true })]
        const badge = resolveNotasBadge(paradaCom('concluida-insucesso', pedidos))
        expect(badge.isGrupoMisto).toBe(false)
        expect(badge.label).toBe('2 notas')
    })

    it('parada sem `pedidos` conta 1 nota e não exibe selo — mesmo fallback de countParadasByStatus', () => {
        expect(resolveNotasBadge({ status: 'pendente', pedidos: [] })).toMatchObject({
            totalNotas: 1,
            notasEntregues: 0,
            label: null,
        })
        expect(resolveNotasBadge({ status: 'pendente' })).toMatchObject({ totalNotas: 1, label: null })
    })
})

describe('resolveProgressoTexto — linha de progresso da rota', () => {
    it('com notas a mais que paradas, separa as duas grandezas (26 portas, 56 notas)', () => {
        expect(
            resolveProgressoTexto(contagem({ total: 26, concluidas: 12, notasTotal: 56, notasConcluidas: 34 })),
        ).toBe('12 de 26 paradas · 34 de 56 notas')
    })

    it('1 nota por parada → texto curto de sempre (nenhuma empresa nova vê jargão novo)', () => {
        expect(
            resolveProgressoTexto(contagem({ total: 10, concluidas: 3, notasTotal: 10, notasConcluidas: 3 })),
        ).toBe('3 de 10 concluídas')
    })

    it('rota vazia não quebra', () => {
        expect(resolveProgressoTexto(contagem({}))).toBe('0 de 0 concluídas')
    })
})
