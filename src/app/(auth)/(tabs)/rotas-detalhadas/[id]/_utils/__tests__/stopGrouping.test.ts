/**
 * Agrupamento de PEDIDOS em PARADAS.
 *
 * Regra: agrupa VIZINHOS CONTÍGUOS (sequenceOrder adjacente) com a mesma chave.
 * Nunca por afinidade — afinidade reordenaria o itinerário que o otimizador
 * decidiu. Em rota legada (planejada antes da Camada 1, ou reordenada à mão) os
 * irmãos podem não estar contíguos: aí a mesma porta vira DUAS paradas. É o
 * comportamento seguro, e o teste `rota legada` abaixo o congela de propósito.
 */
import { ServiceType } from '@/domain/agility/service/dto/types'

import {
    contarChavesRepetidas,
    findGrupoDoServico,
    groupContiguousStops,
    stopKeyOf,
    type StopKeyInput,
} from '../stopGrouping'

function svc(over: Partial<StopKeyInput> & { id: string }): StopKeyInput {
    return {
        addressId: 'addr-1',
        customerId: 'cli-1',
        fantasyName: null,
        responsible: null,
        serviceType: ServiceType.DELIVERY,
        ...over,
    }
}

describe('stopKeyOf', () => {
    it('mesma porta e mesmo cliente → mesma chave', () => {
        expect(stopKeyOf(svc({ id: 'a' }))).toBe(stopKeyOf(svc({ id: 'b' })))
    })

    it('mesmo endereço, clientes diferentes → chaves diferentes (2 recebedores, 2 canhotos)', () => {
        expect(stopKeyOf(svc({ id: 'a', customerId: 'cli-1' })))
            .not.toBe(stopKeyOf(svc({ id: 'b', customerId: 'cli-2' })))
    })

    it('cai para fantasyName quando não há customerId, normalizando caixa e espaços', () => {
        const a = svc({ id: 'a', customerId: null, fantasyName: ' SAO LUIZ CRATO ' })
        const b = svc({ id: 'b', customerId: null, fantasyName: 'sao luiz crato' })
        expect(stopKeyOf(a)).toBe(stopKeyOf(b))
    })

    it('sem addressId nunca agrupa (não dá para afirmar que é a mesma porta)', () => {
        const a = svc({ id: 'a', addressId: null })
        const b = svc({ id: 'b', addressId: null })
        expect(stopKeyOf(a)).not.toBe(stopKeyOf(b))
    })

    it('RETORNO e TRANSFERÊNCIA nunca agrupam (parada única / A→B com dois endereços)', () => {
        const r1 = svc({ id: 'r1', serviceType: ServiceType.RETURN })
        const r2 = svc({ id: 'r2', serviceType: ServiceType.RETURN })
        const t1 = svc({ id: 't1', serviceType: ServiceType.TRANSFER })
        const t2 = svc({ id: 't2', serviceType: ServiceType.TRANSFER })
        expect(stopKeyOf(r1)).not.toBe(stopKeyOf(r2))
        expect(stopKeyOf(t1)).not.toBe(stopKeyOf(t2))
    })

    it('tipos diferentes na mesma porta não agrupam (entrega e coleta têm fluxos distintos)', () => {
        const entrega = svc({ id: 'a', serviceType: ServiceType.DELIVERY })
        const coleta = svc({ id: 'b', serviceType: ServiceType.PICKUP })
        expect(stopKeyOf(entrega)).not.toBe(stopKeyOf(coleta))
    })
})

describe('groupContiguousStops', () => {
    it('5 pedidos contíguos da mesma porta → 1 grupo de 5', () => {
        const services = ['a', 'b', 'c', 'd', 'e'].map((id) => svc({ id }))
        const groups = groupContiguousStops(services)
        expect(groups).toHaveLength(1)
        expect(groups[0].map((s) => s.id)).toEqual(['a', 'b', 'c', 'd', 'e'])
    })

    it('rota legada: mesma chave NÃO contígua → 2 grupos, itinerário preservado', () => {
        const services = [
            svc({ id: 'a' }),
            svc({ id: 'meio', addressId: 'addr-2', customerId: 'cli-2' }),
            svc({ id: 'b' }),
        ]
        const groups = groupContiguousStops(services)
        expect(groups.map((g) => g.map((s) => s.id))).toEqual([['a'], ['meio'], ['b']])
    })

    it('lista vazia → nenhum grupo', () => {
        expect(groupContiguousStops([])).toEqual([])
    })
})

describe('findGrupoDoServico', () => {
    it('acha o grupo que contém o serviço', () => {
        const groups = groupContiguousStops([svc({ id: 'a' }), svc({ id: 'b' })])
        expect(findGrupoDoServico(groups, 'b')?.map((s) => s.id)).toEqual(['a', 'b'])
    })

    it('id desconhecido → null', () => {
        const groups = groupContiguousStops([svc({ id: 'a' })])
        expect(findGrupoDoServico(groups, 'zzz')).toBeNull()
    })
})

describe('contarChavesRepetidas', () => {
    it('marca a chave que aparece em mais de um grupo (mesma porta partida pelo itinerário)', () => {
        const groups = groupContiguousStops([
            svc({ id: 'a' }),
            svc({ id: 'meio', addressId: 'addr-2', customerId: 'cli-2' }),
            svc({ id: 'b' }),
        ])
        const repetidas = contarChavesRepetidas(groups)
        expect(repetidas.has(stopKeyOf(svc({ id: 'a' })))).toBe(true)
        expect(repetidas.has(stopKeyOf(svc({ id: 'meio', addressId: 'addr-2', customerId: 'cli-2' })))).toBe(false)
    })
})
