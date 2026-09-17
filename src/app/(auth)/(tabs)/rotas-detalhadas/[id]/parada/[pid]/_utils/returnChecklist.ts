/**
 * Montagem do checklist enviado na conclusão da parada de RETORNO.
 *
 * A lista tem DUAS origens e o backend fecha a tentativa de devolução por ela
 * (`returnedServiceIds` → `resolveReturnedAttempts`, com `returnSource = RETURN_STOP`):
 * os itens do manifesto (materiais) e os pedidos FALHADOS que não têm linha de
 * manifesto — estes últimos a tela já exibia e travava, mas nunca enviava, e por
 * isso a tentativa deles ficava aguardando a central.
 *
 * O pedido sem manifesto vai com `quantity: 0` e `received: 0`: é exatamente o
 * caso que `isReturnedChecklistItem` trata como devolvido quando `checked` é
 * verdadeiro (`!(quantity > 0)`). `material` NÃO pode ser vazio — o DTO do
 * backend o valida com `@IsNotEmpty()`.
 *
 * @module rotas-detalhadas/parada/utils/returnChecklist
 */

import type { ServicePointResponse } from '@/domain/agility/routing/dto'
import type { ReturnManifestItem } from '@/domain/agility/routing/routingAPI'
import type { ReturnChecklistItem } from '@/domain/agility/service/dto/request/service-completion-details.request'

export interface MontarReturnChecklistParams {
    /** Itens do manifesto de retorno, na ordem em que a tela os renderiza. */
    items: ReturnManifestItem[]
    /** Check de cada item do manifesto, pelo ÍNDICE (é assim que a tela guarda). */
    conferred: Record<number, boolean>
    /** Quantidade recebida já clampada em [0, esperado]. */
    receivedQty: (idx: number, expected: number) => number
    /** Pedidos FALHADOS da rota sem linha de manifesto. */
    pedidosVolta: ServicePointResponse[]
    /** Check dos cartões de pedido, por id do pedido. */
    pedidoConferred: Record<string, boolean>
}

/** Rótulo do cartão sem manifesto. `ServicePointResponse` não traz código. */
const ROTULO_PEDIDO_SEM_MANIFESTO = 'Pedido devolvido'

export function montarReturnChecklist({
    items,
    conferred,
    receivedQty,
    pedidosVolta,
    pedidoConferred,
}: MontarReturnChecklistParams): ReturnChecklistItem[] {
    const checklist: ReturnChecklistItem[] = items.map((item, idx) => ({
        material: item.material,
        serviceId: item.serviceId,
        serviceCode: item.serviceCode,
        quantity: item.quantity,
        unit: item.unit,
        origin: item.origin,
        reason: item.reason,
        received: receivedQty(idx, Number(item.quantity ?? 0)),
        checked: !!conferred[idx],
    }))

    const jaNoChecklist = new Set(checklist.map((i) => i.serviceId))

    for (const pedido of pedidosVolta) {
        if (!pedido?.id || jaNoChecklist.has(pedido.id)) continue
        jaNoChecklist.add(pedido.id)
        checklist.push({
            material: pedido.title || ROTULO_PEDIDO_SEM_MANIFESTO,
            serviceId: pedido.id,
            serviceCode: null,
            quantity: 0,
            unit: null,
            origin: 'UNDELIVERED',
            reason: 'FAILED',
            received: 0,
            checked: !!pedidoConferred[pedido.id],
        })
    }

    return checklist
}
