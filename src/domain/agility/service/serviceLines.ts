import type { ServiceLine } from './dto/response/service-line.response'
import { ServiceType } from './dto/types'

/**
 * As linhas de um serviço, num lugar só (épico itens do pedido, fase 3C).
 *
 * O backend pendura as linhas na resposta por `attachServiceLines`: o pedido recebe `items` e, até a
 * fase 4, `materials` com as mesmas linhas; o SERVICE recebe só `materials`. Nenhuma resposta traz
 * `pickupItems`/`pickupMaterials`: a coleta vem na mesma lista, com `direction: 'PICKUP'`.
 *
 * FASE 4: o pedido deixa de receber `materials`, e o `?? svc.materials` de `serviceLines` sai.
 */

type TipoDoServico = ServiceType | string | null | undefined

/** O formato cru da resposta. Fora deste módulo, o `ServiceResponse` não tem `items` nem `materials`. */
type RespostaComLinhas = {
    serviceType?: TipoDoServico
    items?: ServiceLine[] | null
    materials?: ServiceLine[] | null
}

/** `null` quando a resposta não traz linhas, para separar "não veio" de "vazio". */
export function serviceLines(svc: RespostaComLinhas | null | undefined): ServiceLine[] | null {
    if (!svc) return null
    if (svc.serviceType === ServiceType.SERVICE) return svc.materials ?? null
    return svc.items ?? svc.materials ?? null
}

/** A linha sem `direction` é entrega, como no backend. */
export function splitByDirection(lines: readonly ServiceLine[]): { delivery: ServiceLine[]; pickup: ServiceLine[] } {
    const delivery: ServiceLine[] = []
    const pickup: ServiceLine[] = []
    for (const line of lines) {
        if (line.direction === 'PICKUP') pickup.push(line)
        else delivery.push(line)
    }
    return { delivery, pickup }
}

export function hasPickupLines(svc: RespostaComLinhas | null | undefined): boolean {
    return (serviceLines(svc) ?? []).some((line) => line.direction === 'PICKUP')
}

/** A família da rota de linha: o SERVICE em `/materials`; todo o resto, inclusive o tipo nulo, em `/items`. */
export function lineRoute(serviceType: TipoDoServico): 'items' | 'materials' {
    return serviceType === ServiceType.SERVICE ? 'materials' : 'items'
}

/** "Itens" no pedido e "Equipamentos" no SERVICE; o singular quando `count` é 1. */
export function linesTitle(serviceType: TipoDoServico, count?: number): string {
    const uma = count === 1
    if (serviceType === ServiceType.SERVICE) return uma ? 'Equipamento' : 'Equipamentos'
    return uma ? 'Item' : 'Itens'
}

/**
 * O título do grupo principal vem do tipo, não da direção: o backend grava `items` sempre com
 * `direction: 'DELIVERY'` (só `pickupItems` saem `PICKUP`), e "Entregar" mentiria na coleta.
 */
const TITULO_PRINCIPAL: Partial<Record<string, string>> = {
    [ServiceType.DELIVERY]: 'Entregar',
    [ServiceType.PICKUP]: 'Coletar',
    [ServiceType.TRANSFER]: 'Transportar',
    [ServiceType.RETURN]: 'Devolver',
}

export type LineGroup = { title: string; lines: ServiceLine[] }

/** O que a lista desenha: no SERVICE, um grupo só; no pedido, o principal e "Recolher", só os que têm linha. */
export function lineGroups(lines: readonly ServiceLine[] | null | undefined, serviceType: TipoDoServico): LineGroup[] {
    if (!lines || lines.length === 0) return []
    if (serviceType === ServiceType.SERVICE) return [{ title: 'Equipamentos', lines: [...lines] }]
    const { delivery, pickup } = splitByDirection(lines)
    const groups: LineGroup[] = []
    if (delivery.length > 0) groups.push({ title: serviceType && Object.hasOwn(TITULO_PRINCIPAL, serviceType) ? TITULO_PRINCIPAL[serviceType]! : 'Entregar', lines: delivery })
    if (pickup.length > 0) groups.push({ title: 'Recolher', lines: pickup })
    return groups
}
