import { useQuery } from '@tanstack/react-query';

import { fetchRouteGeometry, LatLng } from './directionsService';

/**
 * Busca (e cacheia) a polyline encoded do trajeto origem → destino via ORS.
 * Desabilitado enquanto `from`/`to` forem nulos. `staleTime` infinito: o
 * traçado entre duas paradas fixas não muda durante a sessão.
 */
export function useRouteDirections(from: LatLng | null, to: LatLng | null) {
    const enabled = !!from && !!to;

    const { data } = useQuery({
        queryKey: [
            'ors-directions',
            from?.latitude, from?.longitude,
            to?.latitude, to?.longitude,
        ],
        queryFn: () => fetchRouteGeometry(from!, to!),
        enabled,
        staleTime: Infinity,
        gcTime: Infinity,
        retry: false,
    });

    return data ?? null;
}
