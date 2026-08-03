/**
 * useRouteLiveSync — mantém a tela de detalhes da rota sincronizada ao vivo.
 *
 * Ouve os eventos do namespace /monitoring (routing_updated / service_updated)
 * e invalida as queries de routing/services para refletir imediatamente uma
 * re-projeção de ETA por atraso (ou replan) sem pull-to-refresh. Filtra pelo
 * routingId corrente quando o payload traz o id.
 */

import { useCallback, useEffect } from 'react'

import { useQueryClient } from '@tanstack/react-query'

import { useTrackingWebSocket } from '@/domain/agility/tracking/useCase/useTrackingWebSocket'
import { routeStopChangedKeys } from '@/domain/queryKeys'

export function useRouteLiveSync(routeId: string | undefined) {
    const queryClient = useQueryClient()

    const invalidate = useCallback(() => {
        if (!routeId) return
        for (const queryKey of routeStopChangedKeys(routeId)) {
            void queryClient.invalidateQueries({ queryKey })
        }
    }, [queryClient, routeId])

    const { connect, disconnect } = useTrackingWebSocket({
        onRoutingUpdated: (data) => {
            if (!data?.id || data.id === routeId) invalidate()
        },
        onServiceUpdated: (data) => {
            if (!data?.routingId || data.routingId === routeId) invalidate()
        },
    })

    useEffect(() => {
        if (!routeId) return
        connect()
        return () => disconnect()
    }, [routeId, connect, disconnect])
}
