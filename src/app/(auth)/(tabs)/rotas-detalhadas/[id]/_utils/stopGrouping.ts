/**
 * Agrupamento de PEDIDOS em PARADAS (Camada 2/3 do épico "parada ≠ pedido").
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
 * A CHAVE (Camada 3, 2026-07-31) espelha a canônica do backend —
 * `agility-services/src/optimization/constants/stop-grouping.ts#stopKeyOf` — e
 * NÃO tem opinião própria sobre o que é uma parada. Qualquer degrau extra aqui
 * (a Camada 2 tinha `fantasyName`/`responsible` na cascata de cliente, e um app
 * anônimo virava `solo:<id>`) é regressão: o app via 3 paradas onde o backend
 * via 1, porque cada lado agrupava por um critério diferente na mesma rota.
 *
 * @module rotas-detalhadas/utils/stopGrouping
 */

import { ServiceType } from '@/domain/agility/service/dto/types'

/**
 * Campos mínimos para identificar a parada de um pedido. `ServiceResponse` os
 * satisfaz. `fantasyName`/`responsible` continuam aqui só para quem os usa na
 * EXIBIÇÃO (nome do card) — não entram na chave, ver `customerKeyOf` abaixo.
 */
export interface StopKeyInput {
    id: string
    addressId?: string | null
    customerId?: string | null
    /** CNPJ/CPF do recebedor. ÚLTIMO degrau da cascata de cliente — ver `customerKeyOf`. */
    taxNumber?: string | null
    fantasyName?: string | null
    responsible?: string | null
    serviceType?: string | null
}

/** Sentido da parada — mesmo enum de 3 valores do backend (`StopSense`). */
type StopSense = 'P' | 'D' | 'T'

function senseOf(serviceType?: string | null): StopSense {
    if (serviceType === ServiceType.PICKUP) return 'P'
    if (serviceType === ServiceType.TRANSFER) return 'T'
    return 'D'
}

/**
 * Parte de endereço da chave. TRANSFER e RETURN nunca agrupam — no backend isso
 * vem de `stopIdentityOfServiceEntity` forçando `addressId: undefined`; aqui é o
 * mesmo efeito, aplicado na hora de montar a chave (o app não separa um
 * "projetor de identidade" do "montador de chave" porque só tem UM chamador,
 * diferente do backend que tem dois pipelines).
 *
 * Sem endereço (ausente, ou forçado pelo tipo) → chave PRÓPRIA por `fallbackId`,
 * único por definição: nunca agrupa com ninguém.
 */
function addressPartOf(
    addressId: string | null | undefined,
    serviceType: string | null | undefined,
    fallbackId: string,
): string {
    const nuncaAgrupa = serviceType === ServiceType.TRANSFER || serviceType === ServiceType.RETURN
    const resolvedAddressId = nuncaAgrupa ? undefined : addressId
    return resolvedAddressId ?? `sem-endereco:${fallbackId}`
}

/**
 * Identidade do cliente: `customerId` → `taxNumber` → `sem-cliente`.
 *
 * FONTE: `agility-services/src/optimization/constants/stop-grouping.ts#customerKeyOf`.
 * A cascata PARA em `taxNumber` de propósito — não é lacuna do app, é decisão
 * espelhada do backend. Lá, um terceiro degrau (`identificationCode`) já existiu
 * e foi REMOVIDO: aquele campo é o código de RASTREIO do pedido (único por
 * serviço, exibido ao destinatário como "Seu pedido …"), não identifica o
 * cliente — sendo único por pedido, aquele ramo nunca agrupava, derrotando o
 * propósito de existir. Um degrau a mais só do lado do app (como
 * `fantasyName`/`responsible`, que a Camada 2 tinha) reabre exatamente essa
 * divergência por outra porta: no teste ao vivo que motivou esta correção, o
 * backend via 1 parada de 4 notas e o app via 3, porque o app cascateava por
 * nome/responsável e o backend não. NÃO adicione um terceiro degrau aqui.
 *
 * `sem-cliente` (nada identifica o recebedor) agrupa só por ENDEREÇO — é o
 * comportamento seguro, porque fisicamente continua sendo uma porta só.
 */
function customerKeyOf(customerId?: string | null, taxNumber?: string | null): string {
    for (const candidato of [customerId, taxNumber]) {
        const v = typeof candidato === 'string' ? candidato.trim() : ''
        if (v !== '') return v
    }
    return 'sem-cliente'
}

/**
 * Chave da parada de um pedido: `(endereço, cliente, sentido)`. Pedidos com a
 * MESMA chave e CONTÍGUOS formam uma parada só.
 *
 * Espelha `stopKeyOf` do backend — mesma fórmula, forma de entrada adaptada (um
 * único objeto com `id` embutido, em vez de `(identity, fallbackId)` separados,
 * porque o app tem um só chamador e não precisa separar "identidade projetada"
 * de "id de fallback").
 *
 * Dois CNPJs no mesmo endereço são DUAS paradas — dois recebedores, dois
 * canhotos. Sem NENHUMA identidade de cliente, agrupa por endereço (ver
 * `customerKeyOf`). O tipo entra como SENTIDO, não `serviceType` cru: DELIVERY e
 * SERVICE têm o mesmo sentido (D) e agrupam juntos; PICKUP e TRANSFER têm
 * sentido próprio e nunca se misturam com entrega no mesmo endereço.
 */
export function stopKeyOf(service: StopKeyInput): string {
    const addressPart = addressPartOf(service.addressId, service.serviceType, service.id)
    const customerPart = customerKeyOf(service.customerId, service.taxNumber)
    return `${addressPart}|${customerPart}|${senseOf(service.serviceType)}`
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
 *
 * Chaves sem endereço (prefixo `sem-endereco:`) são únicas por construção —
 * nunca contam como repetidas.
 */
export function contarChavesRepetidas(groups: StopKeyInput[][]): Set<string> {
    const vistas = new Set<string>()
    const repetidas = new Set<string>()

    for (const grupo of groups) {
        const primeiro = grupo[0]
        if (!primeiro) continue
        const chave = stopKeyOf(primeiro)
        if (chave.startsWith('sem-endereco:')) continue
        if (vistas.has(chave)) {
            repetidas.add(chave)
        } else {
            vistas.add(chave)
        }
    }

    return repetidas
}

/**
 * Ponto do mapa (`/map-data`). O payload é leve: além da coordenada e do
 * título, o backend manda `addressId` (`agility-services`, `buildServicePoints`
 * em `src/routing/service/routing.service.ts`). O que ele NÃO manda é
 * `customerId`/`taxNumber`.
 *
 * `addressId` sai do acessor cru da entidade (`string | undefined`, sem `?? null`),
 * então a chave pode simplesmente NÃO EXISTIR no JSON — por isso é opcional
 * aqui. `title`/`fantasyName`/`responsible` continuam no tipo só para EXIBIÇÃO
 * (label do pino) — não entram mais na chave, ver `mapPointStopKeyOf`.
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
 * Chave de parada para os PONTOS DO MAPA: `addressId` + sentido — SEM cliente e
 * SEM o fallback por coordenada+título que a Camada 2 tinha.
 *
 * Simplificação da Camada 3: como o cliente anônimo agora agrupa por endereço
 * (a mesma regra 1 de `stopKeyOf`), e `/map-data` nunca traz `customerId`/
 * `taxNumber` (`ServicePointResponse`), o degrau de cliente aproximado
 * (`fantasyName ?? responsible`) e o fallback por `title` deixaram de fazer
 * falta — e o `title` era exatamente a fragilidade apontada no review final da
 * Camada 2: texto livre POR PEDIDO (coluna de planilha, placeholder "Ex: Entrega
 * de pacote"), então cinco notas na mesma porta chegavam com cinco títulos
 * diferentes no dado real.
 *
 * Sem endereço (ausente, ou forçado por RETURN/TRANSFER) cai em chave própria
 * por id — nunca agrupa. Desenhar dois pinos onde há uma porta é um erro menor
 * que fundir duas portas distintas.
 */
export function mapPointStopKeyOf(point: MapPointKeyInput): string {
    const addressPart = addressPartOf(point.addressId, point.serviceType, point.id)
    return `${addressPart}|${senseOf(point.serviceType)}`
}
