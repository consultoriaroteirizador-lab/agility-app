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
    groupContiguousBy,
    groupContiguousStops,
    mapPointStopKeyOf,
    stopKeyOf,
    type MapPointKeyInput,
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

/**
 * Chave de parada dos PONTOS DO MAPA (`/map-data`).
 *
 * Prefere a MESMA identidade da lista (`addressId` + cliente), que o backend de
 * fato manda em `buildServicePoints` — verificado em
 * `agility-services/src/routing/service/routing.service.ts:4512-4547`: o payload
 * traz `addressId`, `fantasyName` e `responsible`. O `addressId` sai do acessor
 * cru (`string | undefined`), então a CHAVE PODE VIR AUSENTE do JSON — daí o
 * fallback por coordenada+título continuar existindo.
 *
 * O que NÃO vem é `customerId`; por isso o cliente é aproximado por
 * `fantasyName ?? responsible`, os mesmos fallbacks que `stopKeyOf` já usa.
 */
describe('mapPointStopKeyOf', () => {
    const ponto = (over: Partial<MapPointKeyInput> & { id: string }): MapPointKeyInput => ({
        latitude: -7.2345678,
        longitude: -39.4098765,
        title: 'SAO LUIZ CRATO',
        serviceType: 'DELIVERY',
        ...over,
    })

    /** Ponto como o backend manda de verdade: com addressId e nome do cliente. */
    const pontoReal = (over: Partial<MapPointKeyInput> & { id: string }): MapPointKeyInput =>
        ponto({ addressId: 'addr-1', fantasyName: 'SAO LUIZ CRATO', ...over })

    describe('identidade da porta (addressId + cliente)', () => {
        it('mesmo addressId e mesmo cliente → mesma chave, mesmo com TÍTULOS DIFERENTES', () => {
            // `title` é texto livre POR PEDIDO (vem de coluna de planilha,
            // placeholder "Ex: Entrega de pacote"). Cinco notas na mesma porta
            // chegam com cinco títulos diferentes no dado real — a chave não pode
            // depender dele quando existe identidade de verdade.
            expect(mapPointStopKeyOf(pontoReal({ id: 'a', title: 'NF 1001' })))
                .toBe(mapPointStopKeyOf(pontoReal({ id: 'b', title: 'Entrega de pacote' })))
        })

        it('5 notas na mesma porta com títulos diferentes → 1 pino (§8)', () => {
            const pontos = [0, 1, 2, 3, 4].map((i) => pontoReal({ id: `p${i}`, title: `NF ${1000 + i}` }))
            expect(groupContiguousBy(pontos, mapPointStopKeyOf)).toHaveLength(1)
        })

        it('mesmo endereço, clientes diferentes → 2 pinos (dois recebedores, dois canhotos)', () => {
            expect(mapPointStopKeyOf(pontoReal({ id: 'a', fantasyName: 'CLIENTE A' })))
                .not.toBe(mapPointStopKeyOf(pontoReal({ id: 'b', fantasyName: 'CLIENTE B' })))
        })

        it('addressId diferente → chaves diferentes, ainda que a coordenada coincida', () => {
            expect(mapPointStopKeyOf(pontoReal({ id: 'a', addressId: 'addr-1' })))
                .not.toBe(mapPointStopKeyOf(pontoReal({ id: 'b', addressId: 'addr-2' })))
        })

        it('cai para `responsible` quando não há `fantasyName`, normalizando caixa e espaços', () => {
            expect(mapPointStopKeyOf(pontoReal({ id: 'a', fantasyName: null, responsible: ' Maria Silva ' })))
                .toBe(mapPointStopKeyOf(pontoReal({ id: 'b', fantasyName: null, responsible: 'maria silva' })))
        })
    })

    describe('fallback por coordenada + título (quando o addressId não vem)', () => {
        it('mesma coordenada e mesmo título → mesma chave', () => {
            expect(mapPointStopKeyOf(ponto({ id: 'a' }))).toBe(mapPointStopKeyOf(ponto({ id: 'b' })))
        })

        it('coordenadas distintas → chaves distintas', () => {
            expect(mapPointStopKeyOf(ponto({ id: 'a' })))
                .not.toBe(mapPointStopKeyOf(ponto({ id: 'b', latitude: -7.3 })))
        })

        it('sem título não agrupa (não dá para afirmar que é o mesmo recebedor)', () => {
            expect(mapPointStopKeyOf(ponto({ id: 'a', title: null })))
                .not.toBe(mapPointStopKeyOf(ponto({ id: 'b', title: null })))
        })

        it('sem addressId E sem título → `solo:`, nunca agrupa', () => {
            const chave = mapPointStopKeyOf(ponto({ id: 'a', title: null, addressId: null }))
            expect(chave).toBe('solo:a')
            expect(chave).not.toBe(mapPointStopKeyOf(ponto({ id: 'b', title: null, addressId: null })))
        })

        it('com addressId mas SEM cliente, usa o fallback antigo em vez de desistir', () => {
            // Não é regressão do que existia: sem nome de cliente a coordenada +
            // título continuam sendo a melhor aproximação disponível.
            expect(mapPointStopKeyOf(ponto({ id: 'a', addressId: 'addr-1', fantasyName: null })))
                .toBe(mapPointStopKeyOf(ponto({ id: 'b', addressId: 'addr-1', fantasyName: null })))
        })

        it('chaves de formas diferentes não colidem (uma com addressId, outra sem)', () => {
            expect(mapPointStopKeyOf(pontoReal({ id: 'a' })))
                .not.toBe(mapPointStopKeyOf(ponto({ id: 'b' })))
        })
    })

    describe('tipos que nunca agrupam', () => {
        it('RETORNO nunca agrupa, nem com addressId e cliente idênticos', () => {
            expect(mapPointStopKeyOf(pontoReal({ id: 'r1', serviceType: ServiceType.RETURN })))
                .not.toBe(mapPointStopKeyOf(pontoReal({ id: 'r2', serviceType: ServiceType.RETURN })))
        })

        it('TRANSFERÊNCIA nunca agrupa (A→B, dois endereços e wizard próprio)', () => {
            expect(mapPointStopKeyOf(pontoReal({ id: 't1', serviceType: ServiceType.TRANSFER })))
                .not.toBe(mapPointStopKeyOf(pontoReal({ id: 't2', serviceType: ServiceType.TRANSFER })))
        })

        it('entrega e coleta na mesma porta são pinos distintos (fluxos distintos)', () => {
            expect(mapPointStopKeyOf(pontoReal({ id: 'a', serviceType: ServiceType.DELIVERY })))
                .not.toBe(mapPointStopKeyOf(pontoReal({ id: 'b', serviceType: ServiceType.PICKUP })))
        })
    })

    it('a chave do mapa concorda com a da lista para a mesma porta', () => {
        // Fonte única de propósito: se o mapa e a lista discordarem sobre o que é
        // "uma parada", o motorista lê 5 pinos para 1 card (ou o contrário).
        const pontos = [0, 1, 2].map((i) => pontoReal({ id: `n${i}`, title: `NF ${i}` }))
        const servicos = [0, 1, 2].map((i) =>
            svc({ id: `n${i}`, addressId: 'addr-1', customerId: null, fantasyName: 'SAO LUIZ CRATO' }),
        )

        expect(groupContiguousBy(pontos, mapPointStopKeyOf)).toHaveLength(1)
        expect(groupContiguousStops(servicos)).toHaveLength(1)
    })
})
