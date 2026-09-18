/**
 * Montagem do checklist enviado na conclusão da parada de RETORNO.
 *
 * A lista tem DUAS origens e o backend fecha a tentativa de devolução por ela
 * (`returnedServiceIds` → `resolveReturnedAttempts`, com `returnSource = RETURN_STOP`):
 * os itens do manifesto (materiais) e as PENDÊNCIAS de devolução da rota que não
 * têm linha de manifesto.
 *
 * As pendências vêm de `GET /routings/:id/pending-returns`, não mais da dedução
 * "pedido FALHADO ainda na rota": o pedido CANCELADO devolvido sai da rota no
 * mesmo gesto do cancelamento e por isso nunca aparecia aqui.
 *
 * O pedido sem manifesto vai com `quantity: 0` e `received: 0`: é exatamente o
 * caso que `isReturnedChecklistItem` trata como devolvido quando `checked` é
 * verdadeiro (`!(quantity > 0)`). `material` NÃO pode ser vazio — o DTO do
 * backend o valida com `@IsNotEmpty()`.
 *
 * @module rotas-detalhadas/parada/utils/returnChecklist
 */

import type { PendingReturnResponse, ReturnManifestItem } from '@/domain/agility/routing/routingAPI'
import type { ReturnChecklistItem } from '@/domain/agility/service/dto/request/service-completion-details.request'

export interface MontarReturnChecklistParams {
    /** Itens do manifesto de retorno, na ordem em que a tela os renderiza. */
    items: ReturnManifestItem[]
    /** Check de cada item do manifesto, pelo ÍNDICE (é assim que a tela guarda). */
    conferred: Record<number, boolean>
    /** Quantidade recebida já clampada em [0, esperado]. */
    receivedQty: (idx: number, expected: number) => number
    /** O que falta devolver na rota, vindo do backend. */
    pendentes: PendingReturnResponse[]
    /** Check dos cartões de pedido, por id do pedido. */
    pedidoConferred: Record<string, boolean>
}

/** Último recurso: a pendência sem código nem título. */
const ROTULO_PEDIDO_SEM_MANIFESTO = 'Pedido devolvido'

export function montarReturnChecklist({
    items,
    conferred,
    receivedQty,
    pendentes,
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

    for (const pendente of pendentes) {
        if (!pendente?.serviceId || jaNoChecklist.has(pendente.serviceId)) continue
        jaNoChecklist.add(pendente.serviceId)
        checklist.push({
            // O código vem primeiro: é o que está na etiqueta da caixa, e é o que
            // a pendência traz e o `ServicePointResponse` da dedução antiga não tinha.
            material: pendente.serviceCode || pendente.title || ROTULO_PEDIDO_SEM_MANIFESTO,
            serviceId: pendente.serviceId,
            serviceCode: pendente.serviceCode ?? null,
            quantity: 0,
            unit: null,
            origin: 'UNDELIVERED',
            reason: 'FAILED',
            received: 0,
            checked: !!pedidoConferred[pendente.serviceId],
        })
    }

    return checklist
}
