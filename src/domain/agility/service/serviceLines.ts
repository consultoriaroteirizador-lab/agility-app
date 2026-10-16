import type { EquipmentLookupResponse, ServiceLine, SwapLineRequest } from './dto/response/service-line.response'
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
    if (delivery.length > 0) groups.push({ title: serviceType && Object.prototype.hasOwnProperty.call(TITULO_PRINCIPAL, serviceType) ? TITULO_PRINCIPAL[serviceType]! : 'Entregar', lines: delivery })
    if (pickup.length > 0) groups.push({ title: 'Recolher', lines: pickup })
    return groups
}

// ============================================
// Troca de equipamento na parada (fase 3D)
// ============================================

export const SWAP_DESCRIPTION_REQUIRED = 'Código não cadastrado: informe a descrição'

/**
 * As linhas que o motorista pode trocar (D4): "Levei" (CHECKED), quantidade 1 e de entrega. A coleta
 * (PICKUP) o backend recusa; a linha sem `direction` é entrega, como em `splitByDirection`.
 */
export function swappableLines(lines: readonly ServiceLine[] | null | undefined): ServiceLine[] {
    return (lines ?? []).filter(
        (line) => line.status === 'CHECKED' && Number(line.quantity) === 1 && line.direction !== 'PICKUP',
    )
}

/** A linha que `line` substituiu (D1); `null` quando `line` não é troca ou a original não veio na lista. */
export function replacedLineOf(lines: readonly ServiceLine[] | null | undefined, line: ServiceLine): ServiceLine | null {
    if (!line.replacesMaterialId) return null
    return (lines ?? []).find((candidata) => candidata.id === line.replacesMaterialId) ?? null
}

/** "No lugar de: {A} (S/N …)"; sem série na A, só o nome; `null` quando não há A. */
export function replacedLineLabel(lines: readonly ServiceLine[] | null | undefined, line: ServiceLine): string | null {
    const original = replacedLineOf(lines, line)
    if (!original) return null
    return original.serialNumber
        ? `No lugar de: ${original.material} (S/N ${original.serialNumber})`
        : `No lugar de: ${original.material}`
}

/**
 * O resultado da consulta vale só para o código que está no campo (comparado sem espaços nas pontas,
 * como o backend). Código mudado depois da consulta dá `null` (não consultado): a tela não mostra o
 * nome nem abre ou esconde a Descrição por uma consulta velha.
 */
export function lookupFoundFor(code: string, lookup: EquipmentLookupResponse | null | undefined): boolean | null {
    if (!lookup || lookup.code !== code.trim()) return null
    return lookup.found
}

export type SwapForm = { code: string; serialNumber: string; description: string; reason: string }
export type SwapFormErrors = Partial<Record<'code' | 'serialNumber' | 'description', string>>

/** Validação da troca (D3). `found`: o que a consulta disse; `null` = não consultado. */
export function swapFormErrors(input: { code: string; serialNumber: string; found: boolean | null; description: string }): SwapFormErrors {
    const errors: SwapFormErrors = {}
    if (input.code.trim() === '') errors.code = 'Informe o código'
    if (input.serialNumber.trim() === '') errors.serialNumber = 'Informe o nº de série'
    if (input.found === false && input.description.trim() === '') errors.description = SWAP_DESCRIPTION_REQUIRED
    return errors
}

/** O corpo do POST da troca: tudo sem espaços nas pontas; descrição e motivo vazios não vão. */
export function swapRequestBody(form: SwapForm): SwapLineRequest {
    const description = form.description.trim()
    const reason = form.reason.trim()
    return {
        code: form.code.trim(),
        serialNumber: form.serialNumber.trim(),
        ...(description ? { description } : {}),
        ...(reason ? { reason } : {}),
    }
}
