import { useQuery } from '@tanstack/react-query'

import { KEY_ROUTINGS } from '@/domain/queryKeys'
import type { Id } from '@/types/base'

import { routingService } from '../routingService'

/**
 * Busca o ledger de não-entregues (cancelados / devolvidos à fila / insucesso)
 * de uma rota, para popular a seção "Concluídas com insucesso".
 *
 * É dado de ocorrência da rota — usa `staleTime: 0` para refazer o fetch sempre
 * que o motorista reabre a rota (mesmo padrão do fetch de serviços por rota).
 */
export function useRouteNonDelivered(
    routingId: Id | null | undefined,
    options?: { enabled?: boolean },
) {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: [KEY_ROUTINGS, 'non-delivered', routingId],
        queryFn: () => routingService.findNonDelivered(routingId!),
        enabled: (options?.enabled ?? true) && !!routingId,
        retry: false,
        staleTime: 0,
    })

    return {
        items: data ?? [],
        isLoading,
        isError,
        refetch,
        isRefetching,
    }
}
