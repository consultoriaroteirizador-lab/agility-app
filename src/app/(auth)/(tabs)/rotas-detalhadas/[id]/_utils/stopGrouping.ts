/**
 * Agrupamento de PEDIDOS em PARADAS (Camada 2 do épico "parada ≠ pedido").
 *
 * `Service` acumula dois papéis no modelo: é o PEDIDO e é a PARADA. Com os dados
 * reais do cliente, o motorista veria 56 paradas onde são 26 — a mesma porta 5
 * vezes seguidas. Aqui está a fonte ÚNICA da resposta para "estes dois pedidos
 * são a mesma parada?". Fonte única de propósito: se o gate de "uma parada por
 * vez" e a lista da tela responderem diferente, o motorista trava sem entender.
 *
 * O agrupamento é por VIZINHANÇA (contíguos na ordem do roteirizador), nunca por
 * afinidade — afinidade reordenaria o itinerário que o otimizador decidiu. A
 * Camada 1 (backend, agility-services PR #427) garante que os pedidos de uma
 * mesma parada saem com `sequenceOrder` contíguo.
 *
 * @module rotas-detalhadas/utils/stopGrouping
 */

import { ServiceType } from '@/domain/agility/service/dto/types'

/** Campos mínimos para identificar a parada de um pedido. `ServiceResponse` os satisfaz. */
export interface StopKeyInput {
    id: string
    addressId?: string | null
    customerId?: string | null
    fantasyName?: string | null
    responsible?: string | null
    serviceType?: string | null
}

function normalizar(valor: string): string {
    return valor.trim().toLowerCase()
}

/**
 * Chave da parada de um pedido. Pedidos com a MESMA chave e CONTÍGUOS formam
 * uma parada só.
 *
 * `solo:<id>` é a chave de quem nunca agrupa — é única por definição, então dois
 * "solo" jamais colidem:
 *  - RETURN: parada final no CD, uma só por rota;
 *  - TRANSFER: ponto-a-ponto (A→B), tem dois endereços e wizard próprio;
 *  - sem `addressId`: não dá para afirmar que é a mesma porta;
 *  - sem identificação de cliente: dois recebedores no mesmo endereço são duas
 *    paradas (decisão da Camada 1 — dois canhotos), e sem nome não dá para saber.
 *
 * O tipo entra na chave: entrega e coleta na mesma porta têm fluxos distintos, e
 * mantê-las separadas preserva o `tipo` escalar da `Parada` e o redirect de N==1.
 */
export function stopKeyOf(service: StopKeyInput): string {
    if (
        service.serviceType === ServiceType.RETURN ||
        service.serviceType === ServiceType.TRANSFER
    ) {
        return `solo:${service.id}`
    }

    if (!service.addressId) {
        return `solo:${service.id}`
    }

    const cliente = service.customerId ?? service.fantasyName ?? service.responsible
    if (!cliente) {
        return `solo:${service.id}`
    }

    return `addr:${service.addressId}|cli:${normalizar(cliente)}|tipo:${service.serviceType ?? ''}`
}

/** Agrupa itens ADJACENTES que compartilham a chave. Não reordena nada. */
export function groupContiguousBy<T>(items: T[], keyOf: (item: T) => string): T[][] {
    const groups: T[][] = []
    let chaveAtual: string | null = null

    for (const item of items) {
        const chave = keyOf(item)
        if (groups.length === 0 || chave !== chaveAtual) {
            groups.push([item])
            chaveAtual = chave
        } else {
            groups[groups.length - 1].push(item)
        }
    }

    return groups
}

/**
 * Agrupa pedidos JÁ ORDENADOS por `sequenceOrder`. Ordenar é responsabilidade de
 * quem chama (`getParadasOrdenadas`) — este módulo não reordena itinerário.
 */
export function groupContiguousStops<T extends StopKeyInput>(orderedServices: T[]): T[][] {
    return groupContiguousBy(orderedServices, stopKeyOf)
}

/** Grupo que contém o serviço, ou null. */
export function findGrupoDoServico<T extends StopKeyInput>(
    groups: T[][],
    serviceId: string,
): T[] | null {
    return groups.find((grupo) => grupo.some((s) => s.id === serviceId)) ?? null
}

/**
 * Chaves que aparecem em MAIS DE UM grupo — a mesma porta que o itinerário
 * separou (rota legada ou reordenada à mão). Serve para avisar o motorista na
 * tela, para que não pareça defeito.
 */
export function contarChavesRepetidas(groups: StopKeyInput[][]): Set<string> {
    const vistas = new Set<string>()
    const repetidas = new Set<string>()

    for (const grupo of groups) {
        const primeiro = grupo[0]
        if (!primeiro) continue
        const chave = stopKeyOf(primeiro)
        if (chave.startsWith('solo:')) continue
        if (vistas.has(chave)) {
            repetidas.add(chave)
        } else {
            vistas.add(chave)
        }
    }

    return repetidas
}

/**
 * Ponto do mapa (`/map-data`). O payload é leve, mas NÃO é anônimo: além da
 * coordenada e do título, o backend manda `addressId`, `fantasyName` e
 * `responsible` (`agility-services`, `buildServicePoints` em
 * `src/routing/service/routing.service.ts:4512-4547`). O que ele NÃO manda é
 * `customerId`.
 *
 * `addressId` sai do acessor cru da entidade (`string | undefined`, sem `?? null`),
 * então a chave pode simplesmente NÃO EXISTIR no JSON — por isso todos os campos
 * de identidade são opcionais aqui.
 */
export interface MapPointKeyInput {
    id: string
    latitude: number
    longitude: number
    title?: string | null
    serviceType?: string | null
    /** Endereço do pedido. Pode vir ausente do payload (ver acima). */
    addressId?: string | null
    fantasyName?: string | null
    responsible?: string | null
}

/**
 * Chave de parada para os PONTOS DO MAPA.
 *
 * Prefere a MESMA identidade que `stopKeyOf` usa na lista — endereço + cliente —
 * porque é a única que descreve uma porta. O caminho antigo (coordenada
 * arredondada + título) fica como FALLBACK: `title` é texto livre POR PEDIDO
 * (vem de coluna de planilha, com placeholder "Ex: Entrega de pacote"), então
 * cinco notas na mesma porta chegam com cinco títulos diferentes no dado real e
 * o mapa desenharia cinco pinos — exatamente o que este épico existe para
 * remover.
 *
 * Cliente é aproximado por `fantasyName ?? responsible` porque `customerId` não
 * vem no payload do mapa. Sem cliente, o fallback por coordenada+título ainda é
 * melhor que desistir, e não corre o risco de fundir dois recebedores nomeados.
 *
 * Segue deliberadamente conservadora: RETURN/TRANSFER e "sem identidade nenhuma"
 * devolvem `solo:<id>`, que é único por definição. Desenhar dois pinos onde há
 * uma porta é um erro menor que fundir duas portas distintas.
 */
export function mapPointStopKeyOf(point: MapPointKeyInput): string {
    if (
        point.serviceType === ServiceType.RETURN ||
        point.serviceType === ServiceType.TRANSFER
    ) {
        return `solo:${point.id}`
    }

    const cliente = point.fantasyName ?? point.responsible
    if (point.addressId && cliente) {
        return `addr:${point.addressId}|cli:${normalizar(cliente)}|tipo:${point.serviceType ?? ''}`
    }

    const titulo = point.title ? normalizar(point.title) : ''
    if (!titulo) {
        return `solo:${point.id}`
    }

    return `geo:${point.latitude.toFixed(5)},${point.longitude.toFixed(5)}|t:${titulo}|tipo:${point.serviceType ?? ''}`
}
