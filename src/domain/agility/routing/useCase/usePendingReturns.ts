import { useQuery } from '@tanstack/react-query'

import { KEY_ROUTINGS } from '@/domain/queryKeys'
import type { Id } from '@/types/base'

import { routingService } from '../routingService'

/**
 * O que ainda falta devolver ao CD nesta rota, lido das tentativas de entrega.
 *
 * Par do `useReturnManifest`: o manifesto traz MATERIAL, este traz PEDIDO. É o
 * que substitui a dedução por status na tela de retorno — o pedido cancelado
 * devolvido perde a rota no cancelamento e nunca apareceria por lá.
 */
export function usePendingReturns(
    routingId: Id,
    enabled = true,
    options?: { refetchIntervalMs?: number },
) {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: [KEY_ROUTINGS, 'pending-returns', routingId],
        queryFn: () => routingService.findPendingReturns(routingId),
        enabled: !!routingId && enabled,
        retry: false,
        // Reserva de polling — mesmo contrato do `useFindServicesByRoutingId`.
        // Só a TELA DA ROTA liga: ela fica aberta enquanto o motorista dirige, e
        // é lá que o cancelamento precisa aparecer sem ele mexer em nada. A
        // parada de retorno não liga: é uma parada, aberta por alguns minutos no
        // fim da rota, e o motorista está com o celular na mão.
        refetchInterval: options?.refetchIntervalMs ?? false,
    })

    return {
        pendentes: data?.result ?? [],
        isLoading,
        isError,
        refetch,
        response: data,
    }
}
