import { useQuery } from '@tanstack/react-query'

import { KEY_ROUTINGS } from '@/domain/queryKeys'
import type { Id } from '@/types/base'

import { routingService } from '../routingService'

/**
 * Manifesto de devolução da parada de retorno: itens esperados de volta no CD
 * (devoluções/coletas + itens não entregues). Alimenta o checklist de conferência.
 */
export function useReturnManifest(routingId: Id, enabled = true) {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: [KEY_ROUTINGS, 'return-manifest', routingId],
        queryFn: () => routingService.getReturnManifest(routingId),
        enabled: !!routingId && enabled,
        retry: false,
    })

    return {
        items: data?.result?.items ?? [],
        isLoading,
        isError,
        refetch,
        response: data,
    }
}
