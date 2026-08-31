/**
 * Derivações de CARGA da oferta — o que o motorista precisa saber antes de aceitar.
 *
 * O backend não expõe totais de carga na rota: `RoutingResponse` traz distância,
 * duração e valor, mas nada de peso/cubagem. Os números por pedido existem
 * (`amountWeight`/`amountVolume`/`amountItems`, serializados por
 * `ServiceEntity.toJson()`), então a soma da rota é derivada aqui, no cliente,
 * a partir dos serviços que já são carregados para montar a timeline.
 *
 * ATENÇÃO ao número exibido: `amount_*` é derivado dos materiais por
 * `computeServiceAmounts`, que multiplica `weight`/`volume` por `quantity`
 * — contrato UNITÁRIO, declarado no integrador. Pedido antigo, gravado quando o
 * integrador mandava o total já somado por linha, ficou com o valor inflado no
 * banco e é isso que vai aparecer. Não é defeito desta derivação; o dado de
 * origem é que está errado nessas linhas.
 */
import type { ServiceResponse } from '@/domain/agility/service/dto'
import { ServiceType } from '@/domain/agility/service/dto/types'

/** Ponto geográfico com coordenada possivelmente ausente (permissão negada, cadastro vazio). */
export interface Coordenada {
    latitude?: number | null
    longitude?: number | null
}

export interface ResumoCarga {
    /** Peso total da carga entregue na rota, em kg. */
    pesoKg: number
    /** Cubagem total, em m³. */
    volumeM3: number
    /** Contagem de itens/volumes. */
    itens: number
    /** Quantas paradas de cada tipo, da mais frequente para a menos. */
    composicao: Array<{ tipo: ServiceType; quantidade: number }>
    /** Valor da mercadoria transportada (soma de `price`). */
    valorCarga: number
    /** Cobrança na entrega (COD): quanto receber e em quantas paradas. */
    cobranca: { valor: number; paradas: number }
}

const RESUMO_VAZIO: ResumoCarga = {
    pesoKg: 0,
    volumeM3: 0,
    itens: 0,
    composicao: [],
    valorCarga: 0,
    cobranca: { valor: 0, paradas: 0 },
}

/** Campo numérico ausente é 0, nunca NaN — um `null` propagado zera a tela inteira. */
function numero(valor: number | null | undefined): number {
    return typeof valor === 'number' && Number.isFinite(valor) ? valor : 0
}

/**
 * Soma a carga dos serviços da rota.
 *
 * O `RETURN` fica de fora pela mesma razão que não entra na lista de paradas: é o
 * trecho de volta à origem, não um pedido. Ele nasce com cubagem zero, mas contá-lo
 * inflaria a composição com uma "parada" que o motorista não atende.
 */
export function resumirCarga(services: ServiceResponse[] | undefined | null): ResumoCarga {
    if (!services || services.length === 0) return RESUMO_VAZIO

    const relevantes = services.filter((s) => s.serviceType !== ServiceType.RETURN)
    if (relevantes.length === 0) return RESUMO_VAZIO

    const contagem = new Map<ServiceType, number>()
    const resumo: ResumoCarga = {
        pesoKg: 0,
        volumeM3: 0,
        itens: 0,
        composicao: [],
        valorCarga: 0,
        cobranca: { valor: 0, paradas: 0 },
    }

    for (const service of relevantes) {
        resumo.pesoKg += numero(service.amountWeight)
        resumo.volumeM3 += numero(service.amountVolume)
        resumo.itens += numero(service.amountItems)
        resumo.valorCarga += numero(service.price)

        if (service.requiresPayment) {
            resumo.cobranca.valor += numero(service.offerValue)
            resumo.cobranca.paradas += 1
        }

        if (service.serviceType) {
            const tipo = service.serviceType as ServiceType
            contagem.set(tipo, (contagem.get(tipo) ?? 0) + 1)
        }
    }

    resumo.composicao = [...contagem.entries()]
        .map(([tipo, quantidade]) => ({ tipo, quantidade }))
        .sort((a, b) => b.quantidade - a.quantidade)

    return resumo
}

const RAIO_TERRA_KM = 6371

function radianos(graus: number): number {
    return (graus * Math.PI) / 180
}

/**
 * Distância em LINHA RETA (haversine) entre dois pontos, em km.
 *
 * Serve para dimensionar o deslocamento até o início da rota — "vale a pena ir
 * até lá?" — e não substitui distância rodoviária: quem responde isso é o ORS, e
 * pedir uma rota ao backend só para exibir um número na oferta não se paga. Quem
 * exibe precisa deixar claro que é aproximada.
 *
 * Sem coordenada dos dois lados não há estimativa: devolve `null` em vez de 0,
 * porque 0 na tela significa "você já está na origem".
 */
export function distanciaLinhaReta(
    de: Coordenada | null | undefined,
    para: Coordenada | null | undefined,
): number | null {
    const lat1 = de?.latitude
    const lon1 = de?.longitude
    const lat2 = para?.latitude
    const lon2 = para?.longitude

    if (
        typeof lat1 !== 'number' || typeof lon1 !== 'number' ||
        typeof lat2 !== 'number' || typeof lon2 !== 'number'
    ) {
        return null
    }

    const dLat = radianos(lat2 - lat1)
    const dLon = radianos(lon2 - lon1)
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(radianos(lat1)) * Math.cos(radianos(lat2)) * Math.sin(dLon / 2) ** 2

    return RAIO_TERRA_KM * 2 * Math.asin(Math.min(1, Math.sqrt(a)))
}
