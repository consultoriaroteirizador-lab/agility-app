/**
 * Agrupamento de PEDIDOS em PARADAS.
 *
 * Regra: agrupa VIZINHOS CONTÍGUOS (sequenceOrder adjacente) com a mesma chave.
 * Nunca por afinidade — afinidade reordenaria o itinerário que o otimizador
 * decidiu. Em rota legada (planejada antes da Camada 1, ou reordenada à mão) os
 * irmãos podem não estar contíguos: aí a mesma porta vira DUAS paradas. É o
 * comportamento seguro, e o teste `rota legada` abaixo o congela de propósito.
 *
 * A CHAVE em si (Camada 3) espelha a canônica do backend
 * (`agility-services/src/optimization/constants/stop-grouping.ts`). O bloco de
 * PARIDADE abaixo lifta casos do spec de lá (`stop-grouping.spec.ts`) — mesma
 * entrada, mesma relação esperada — para que a divergência não volte.
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
        taxNumber: null,
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

    it('DELIVERY e SERVICE são o MESMO sentido (D) e agrupam juntos', () => {
        const entrega = svc({ id: 'a', serviceType: ServiceType.DELIVERY })
        const servico = svc({ id: 'b', serviceType: ServiceType.SERVICE })
        expect(stopKeyOf(entrega)).toBe(stopKeyOf(servico))
    })

    // ── Regra 1: sem cliente identificado agrupa por ENDEREÇO ─────────────────
    // Inverte o comportamento antigo da Camada 2 (que devolvia `solo:<id>` aqui).
    // Fisicamente continua sendo uma porta só — ver o comentário do backend em
    // `customerKeyOf`.
    it('sem customerId, sem taxNumber → cliente anônimo, agrupa por endereço (regra 1)', () => {
        const a = svc({ id: 'a', customerId: null, taxNumber: null })
        const b = svc({ id: 'b', customerId: null, taxNumber: null })
        expect(stopKeyOf(a)).toBe(stopKeyOf(b))
    })

    it('cai em taxNumber quando não há customerId', () => {
        const a = svc({ id: 'a', customerId: null, taxNumber: '123' })
        const b = svc({ id: 'b', customerId: null, taxNumber: '123' })
        expect(stopKeyOf(a)).toBe(stopKeyOf(b))
    })

    it('taxNumbers diferentes no mesmo endereço, sem customerId → chaves diferentes', () => {
        const a = svc({ id: 'a', customerId: null, taxNumber: '123' })
        const b = svc({ id: 'b', customerId: null, taxNumber: '456' })
        expect(stopKeyOf(a)).not.toBe(stopKeyOf(b))
    })

    // ── Regra 2: a cascata PARA em taxNumber — fantasyName/responsible SAEM da
    // chave. Antes da Camada 3 o app tinha DOIS degraus a mais que o backend
    // nunca teve (fantasyName, responsible); o efeito, com dado real, é o app
    // fundir/separar paradas que o backend decidiu diferente. Aqui os dois
    // pedidos são anônimos (sem customerId/taxNumber) mas têm fantasyName e
    // responsible DIFERENTES — e mesmo assim se fundem, porque esses campos não
    // fazem mais parte da identidade da parada.
    it('fantasyName e responsible NÃO entram na chave (cascata para em taxNumber)', () => {
        const a = svc({ id: 'a', customerId: null, taxNumber: null, fantasyName: 'SAO LUIZ CRATO', responsible: 'Maria' })
        const b = svc({ id: 'b', customerId: null, taxNumber: null, fantasyName: 'OUTRO NOME', responsible: 'João' })
        expect(stopKeyOf(a)).toBe(stopKeyOf(b))
    })
})

/**
 * PARIDADE com o backend — casos copiados (mesma entrada, mesma relação
 * esperada) de `agility-services/src/optimization/constants/stop-grouping.spec.ts`.
 * A assinatura difere (o app usa um único objeto com `id` embutido; o backend
 * recebe `(identity, fallbackId)` separados), mas a RELAÇÃO entre entrada e
 * saída — agrupa / não agrupa — é a mesma fonte de verdade. É este bloco que
 * impede a divergência de voltar.
 */
describe('stopKeyOf — paridade com o backend', () => {
    it('[backend: "agrupa mesmo endereço + mesmo cliente"] mesmo endereço + mesmo cliente → mesma chave', () => {
        const a = stopKeyOf({ id: 'svc-1', addressId: 'addr-1', customerId: 'cli-1' })
        const b = stopKeyOf({ id: 'svc-2', addressId: 'addr-1', customerId: 'cli-1' })
        expect(a).toBe(b)
    })

    it('[backend: "separa clientes diferentes no mesmo endereço"] clientes diferentes → chaves diferentes', () => {
        const a = stopKeyOf({ id: 'svc-1', addressId: 'addr-1', customerId: 'cli-1' })
        const b = stopKeyOf({ id: 'svc-2', addressId: 'addr-1', customerId: 'cli-2' })
        expect(a).not.toBe(b)
    })

    it('[backend: "cai em taxNumber quando não há customerId"] mesmo taxNumber → mesma chave', () => {
        const a = stopKeyOf({ id: 'svc-1', addressId: 'addr-1', taxNumber: '123' })
        const b = stopKeyOf({ id: 'svc-2', addressId: 'addr-1', taxNumber: '123' })
        expect(a).toBe(b)
    })

    // MUTAÇÃO-SENSÍVEL: é este caso que vai a VERMELHO se o degrau `taxNumber` for
    // removido da cascata — os dois cairiam em 'sem-cliente' e passariam a
    // colidir. Ver a prova de mutação no relatório da Task 1.
    it('[backend: "separa taxNumber diferentes no mesmo endereço quando sem customerId"] taxNumbers diferentes → chaves diferentes', () => {
        const a = stopKeyOf({ id: 'svc-1', addressId: 'addr-1', taxNumber: '123' })
        const b = stopKeyOf({ id: 'svc-2', addressId: 'addr-1', taxNumber: '456' })
        expect(a).not.toBe(b)
    })

    it('[backend: "sem nenhuma identidade de cliente, agrupa só por endereço"] cliente anônimo agrupa por endereço', () => {
        const a = stopKeyOf({ id: 'svc-1', addressId: 'addr-1' })
        const b = stopKeyOf({ id: 'svc-2', addressId: 'addr-1' })
        expect(a).toBe(b)
    })

    it('[backend: "coleta e entrega no mesmo endereço são paradas SEPARADAS"] sentido separa coleta de entrega', () => {
        const entrega = stopKeyOf({ id: 'svc-1', addressId: 'addr-1', customerId: 'cli-1', serviceType: ServiceType.DELIVERY })
        const coleta = stopKeyOf({ id: 'svc-2', addressId: 'addr-1', customerId: 'cli-1', serviceType: ServiceType.PICKUP })
        expect(entrega).not.toBe(coleta)
    })

    it('[backend: "serviço sem endereço nunca agrupa com outro"] sem addressId nunca agrupa', () => {
        const a = stopKeyOf({ id: 'svc-1', customerId: 'cli-1' })
        const b = stopKeyOf({ id: 'svc-2', customerId: 'cli-1' })
        expect(a).not.toBe(b)
    })

    it('[backend: "transfer e delivery no mesmo endereço e cliente são paradas SEPARADAS"] TRANSFER nunca agrupa com DELIVERY', () => {
        const transfer = stopKeyOf({ id: 'svc-1', addressId: 'addr-1', customerId: 'cli-1', serviceType: ServiceType.TRANSFER })
        const delivery = stopKeyOf({ id: 'svc-2', addressId: 'addr-1', customerId: 'cli-1', serviceType: ServiceType.DELIVERY })
        expect(transfer).not.toBe(delivery)
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

    it('chave sem endereço (própria por id) nunca conta como repetida', () => {
        const groups = groupContiguousStops([
            svc({ id: 'a', addressId: null }),
            svc({ id: 'b', addressId: null }),
        ])
        expect(contarChavesRepetidas(groups).size).toBe(0)
    })
})

/**
 * Chave de parada dos PONTOS DO MAPA (`/map-data`).
 *
 * Camada 3 simplifica: com cliente anônimo agrupando por ENDEREÇO (regra 1), e
 * `/map-data` nunca trazendo `customerId`/`taxNumber` (`ServicePointResponse`),
 * a chave do mapa não precisa mais de cliente aproximado nem do fallback por
 * coordenada+título — vira só `addressId` + sentido. O fallback por
 * texto-livre (`title`) foi removido: era a fragilidade apontada no review
 * final da Camada 2 (título é texto de planilha, um por pedido, cinco notas na
 * mesma porta chegavam com cinco títulos diferentes no dado real).
 */
describe('mapPointStopKeyOf', () => {
    const ponto = (over: Partial<MapPointKeyInput> & { id: string }): MapPointKeyInput => ({
        latitude: -7.2345678,
        longitude: -39.4098765,
        title: 'SAO LUIZ CRATO',
        serviceType: 'DELIVERY',
        addressId: 'addr-1',
        ...over,
    })

    it('mesmo addressId e mesmo sentido → mesma chave, mesmo com TÍTULOS DIFERENTES', () => {
        expect(mapPointStopKeyOf(ponto({ id: 'a', title: 'NF 1001' })))
            .toBe(mapPointStopKeyOf(ponto({ id: 'b', title: 'Entrega de pacote' })))
    })

    it('5 notas na mesma porta com títulos diferentes → 1 pino (§8)', () => {
        const pontos = [0, 1, 2, 3, 4].map((i) => ponto({ id: `p${i}`, title: `NF ${1000 + i}` }))
        expect(groupContiguousBy(pontos, mapPointStopKeyOf)).toHaveLength(1)
    })

    // Inversão deliberada do comportamento da Camada 2: como o cliente anônimo
    // agrupa por endereço (regra 1) e `/map-data` nunca traz `customerId`, dois
    // "clientes" no mesmo endereço (aproximados por `fantasyName` na Camada 2)
    // viram UM pino agora — é o retrato fiel de "uma porta física", igual à
    // lista de paradas.
    it('mesmo addressId, fantasyName diferentes → MESMO pino (anônimo agrupa por endereço)', () => {
        expect(mapPointStopKeyOf(ponto({ id: 'a', fantasyName: 'CLIENTE A' })))
            .toBe(mapPointStopKeyOf(ponto({ id: 'b', fantasyName: 'CLIENTE B' })))
    })

    it('addressId diferente → chaves diferentes, ainda que a coordenada coincida', () => {
        expect(mapPointStopKeyOf(ponto({ id: 'a', addressId: 'addr-1' })))
            .not.toBe(mapPointStopKeyOf(ponto({ id: 'b', addressId: 'addr-2' })))
    })

    it('sem addressId → chave própria por id, nunca agrupa (mesmo com coordenada e título iguais)', () => {
        const a = mapPointStopKeyOf(ponto({ id: 'a', addressId: null }))
        const b = mapPointStopKeyOf(ponto({ id: 'b', addressId: null }))
        expect(a).not.toBe(b)
        expect(a).toContain('a')
    })

    describe('tipos que nunca agrupam', () => {
        it('RETORNO nunca agrupa, nem com addressId idêntico', () => {
            expect(mapPointStopKeyOf(ponto({ id: 'r1', serviceType: ServiceType.RETURN })))
                .not.toBe(mapPointStopKeyOf(ponto({ id: 'r2', serviceType: ServiceType.RETURN })))
        })

        it('TRANSFERÊNCIA nunca agrupa (A→B, dois endereços e wizard próprio)', () => {
            expect(mapPointStopKeyOf(ponto({ id: 't1', serviceType: ServiceType.TRANSFER })))
                .not.toBe(mapPointStopKeyOf(ponto({ id: 't2', serviceType: ServiceType.TRANSFER })))
        })

        it('entrega e coleta na mesma porta são pinos distintos (fluxos distintos)', () => {
            expect(mapPointStopKeyOf(ponto({ id: 'a', serviceType: ServiceType.DELIVERY })))
                .not.toBe(mapPointStopKeyOf(ponto({ id: 'b', serviceType: ServiceType.PICKUP })))
        })
    })

    it('a chave do mapa concorda com a da lista para a mesma porta (mesmo anônima)', () => {
        // Fonte única de propósito: se o mapa e a lista discordarem sobre o que
        // é "uma parada", o motorista lê 5 pinos para 1 card (ou o contrário).
        const pontos = [0, 1, 2].map((i) => ponto({ id: `n${i}`, title: `NF ${i}` }))
        const servicos = [0, 1, 2].map((i) =>
            svc({ id: `n${i}`, addressId: 'addr-1', customerId: null, taxNumber: null }),
        )

        expect(groupContiguousBy(pontos, mapPointStopKeyOf)).toHaveLength(1)
        expect(groupContiguousStops(servicos)).toHaveLength(1)
    })
})
