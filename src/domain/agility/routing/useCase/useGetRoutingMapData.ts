import { useQuery } from '@tanstack/react-query'

import { KEY_ROUTINGS } from '@/domain/queryKeys'
import type { Id } from '@/types/base'

import { routingService } from '../routingService'

/**
 * @param options.alwaysFresh Refaz o fetch a cada montagem, ignorando o
 * `staleTime` global de 5min (`src/app/_layout.tsx`). Para telas que TRAVAM uma
 * ação com base no status das paradas — hoje o "Cheguei no retorno" — e não
 * podem decidir por um snapshot velho. É a segunda linha de defesa da
 * invalidação de `routeStopChangedKeys`: se algum fluxo novo esquecer de
 * invalidar o `/map-data`, o motorista trava a rota inteira.
 */
export function useGetRoutingMapData(routingId: Id, options?: { alwaysFresh?: boolean }) {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: [KEY_ROUTINGS, 'map-data', routingId],
        queryFn: () => routingService.getMapData(routingId),
        enabled: !!routingId,
        retry: false,
        ...(options?.alwaysFresh ? { staleTime: 0, refetchOnMount: 'always' as const } : {}),
    })

    return {
        mapData: data?.result,
        services: data?.result?.services ?? [],
        routes: data?.result?.routes ?? [],
        origin: data?.result?.origin,
        isLoading,
        isError,
        refetch,
        isRefetching,
        response: data,
    }
}

