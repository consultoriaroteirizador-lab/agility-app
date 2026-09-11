import { useQuery } from '@tanstack/react-query'

import { KEY_ROUTINGS } from '@/domain/queryKeys'

import type { BroadcastingQueryRequest } from '../dto'
import { routingService } from '../routingService'

export function useFindBroadcastingRoutings(
    params?: BroadcastingQueryRequest,
    opts?: { pollWhileAvailable?: boolean; refetchIntervalMs?: number },
) {
    const { data, isLoading, isError, refetch, isRefetching, dataUpdatedAt } = useQuery({
        // toFixed(2) ~ 1 km de precisão: GPS oscilando não cria chave nova a cada fix.
        queryKey: [
            KEY_ROUTINGS,
            'broadcasting',
            params?.driverLatitude?.toFixed(2),
            params?.driverLongitude?.toFixed(2),
        ],
        queryFn: () => routingService.findBroadcasting(params),
        retry: 1,
        refetchOnWindowFocus: true,
        // `pollWhileAvailable` é do OfferAlertProvider (sessão inteira) — sem ele
        // (motorista indisponível), NÃO cai num polling padrão: esse hook também é
        // usado o tempo todo pelo provider, e um default aqui faria o app bater em
        // /routings/broadcasting a cada X segundos mesmo com o motorista indisponível.
        // `refetchIntervalMs` é opt-in — só a tela de Ofertas (aberta pelo motorista) usa.
        refetchInterval: opts?.pollWhileAvailable ? 25_000 : (opts?.refetchIntervalMs ?? false),
    })

    return {
        routings: data?.result ?? [],
        isLoading,
        isError,
        refetch,
        isRefetching,
        response: data,
        dataUpdatedAt,
    }
}


