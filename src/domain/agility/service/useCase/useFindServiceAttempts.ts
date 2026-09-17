import { useQuery } from '@tanstack/react-query'

import { KEY_SERVICES } from '@/domain/queryKeys'
import type { Id } from '@/types/base'

import { serviceService } from '../serviceService'

/**
 * Tentativas de entrega do pedido (GET /services/:id/attempts).
 *
 * `enabled` só quando há id E o pedido já tem tentativa — parada em primeira
 * visita não gasta chamada.
 */
export function useFindServiceAttempts(id: Id | null | undefined, enabled = true) {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: [KEY_SERVICES, id, 'attempts'],
        queryFn: () => serviceService.findAttempts(id!),
        enabled: !!id && enabled,
        retry: false,
    })

    return {
        attempts: data?.result ?? [],
        isLoading,
        isError,
        refetch,
    }
}
