import { useMemo } from 'react';

import { LocationObject } from 'expo-location';

import { useGetRoutingMapData } from '@/domain/agility/routing/useCase';
import { useFindServicesByRoutingId } from '@/domain/agility/service/useCase';
import { useRouteDirections } from '@/domain/ors/useRouteDirections';
import { colors } from '@/theme';

import { sliceRouteBetween } from './geo';
import { Map, MapPoint } from './Map';

type MapVariant = 'coleta' | 'service' | 'entrega';

interface StopRouteMapProps {
    /** ID da roteirização (para buscar paradas + traçado global). */
    routeId?: string | null;
    /** ID do serviço/parada atual. */
    serviceId?: string | null;
    variant?: MapVariant;
    customerName?: string;
    addressText?: string;
    userLocation?: LocationObject | null;
    height?: number;
    /** Coordenadas da parada atual — usadas como fallback enquanto a lista carrega. */
    latitude?: number | null;
    longitude?: number | null;
}

// Cor da próxima parada (esmaecida, secundária) e do trecho de rota.
const NEXT_STOP_COLOR = '#9CA3AF'; // cinza
const ROUTE_COLOR = colors.primary100; // #7063F0 (mesmo do platform)

interface StopCoords {
    id: string;
    latitude: number;
    longitude: number;
    sequenceOrder: number;
}

/**
 * Mapa de uma parada que, além do pino da parada atual, traça o trecho até a
 * PRÓXIMA parada. Fonte do traçado, em ordem de preferência:
 *   1. ORS Directions ao vivo (segue as ruas) — {@link useRouteDirections};
 *   2. recorte do traçado global da roteirização (`mapData.geometry`);
 *   3. linha reta entre as duas paradas (último recurso).
 *
 * A lista de paradas vem de `useFindServicesByRoutingId` (mesma fonte do
 * histórico, com coordenadas via `address`).
 */
export function StopRouteMap({
    routeId,
    serviceId,
    variant = 'service',
    customerName,
    addressText,
    userLocation,
    height,
    latitude,
    longitude,
}: StopRouteMapProps) {
    const { services } = useFindServicesByRoutingId(routeId || undefined);
    const { mapData, routes } = useGetRoutingMapData(routeId || '');

    // Resolve parada atual + próxima (com coordenadas) na ordem da sequência.
    const { current, next, currentIdx } = useMemo(() => {
        const sorted: StopCoords[] = (services ?? [])
            .map(s => ({
                id: s.id,
                latitude: s.address?.latitude as number,
                longitude: s.address?.longitude as number,
                sequenceOrder: s.sequenceOrder ?? 999,
            }))
            .filter(s => s.latitude != null && s.longitude != null)
            .sort((a, b) => a.sequenceOrder - b.sequenceOrder);

        const idx = sorted.findIndex(s => s.id === serviceId);
        return {
            current: idx >= 0 ? sorted[idx] : null,
            next: idx >= 0 ? sorted[idx + 1] ?? null : null,
            currentIdx: idx,
        };
    }, [services, serviceId]);

    // Traçado ao vivo (ORS) parada atual → próxima. Null enquanto carrega/falha.
    const roadGeometry = useRouteDirections(
        current ? { latitude: current.latitude, longitude: current.longitude } : null,
        next ? { latitude: next.latitude, longitude: next.longitude } : null,
    );

    const { points, geometries, coordinateSegments } = useMemo(() => {
        // Sem parada na lista ainda: fallback para a parada atual via lat/lng.
        if (!current) {
            if (latitude == null || longitude == null) {
                return { points: [] as MapPoint[], geometries: undefined, coordinateSegments: undefined };
            }
            return {
                points: [{
                    id: 'current',
                    latitude,
                    longitude,
                    title: customerName,
                    variant,
                }] as MapPoint[],
                geometries: undefined,
                coordinateSegments: undefined,
            };
        }

        const pts: MapPoint[] = [{
            id: current.id,
            latitude: current.latitude,
            longitude: current.longitude,
            title: customerName,
            variant,
            label: currentIdx + 1,
        }];

        let geoms: string[] | undefined;
        let segs: number[][][] | undefined;

        if (next) {
            pts.push({
                id: next.id,
                latitude: next.latitude,
                longitude: next.longitude,
                title: 'Próxima parada',
                color: NEXT_STOP_COLOR,
                size: 30,
                label: currentIdx + 2,
            });

            // Ordem de preferência do traçado (mais fiel ao backend primeiro):
            // 1) geometry do SEGMENTO exato (origem→destino) vindo do map-data;
            // 2) recorte do traçado GLOBAL persistido (map-data.geometry);
            // 3) ORS ao vivo (segue as ruas);
            // 4) linha reta.
            const segmentGeom = (routes ?? []).find(
                r => r.geometry &&
                    r.originServiceId === current.id &&
                    r.destinationServiceId === next.id,
            )?.geometry;

            if (segmentGeom) {
                geoms = [segmentGeom];
            } else if (mapData?.geometry) {
                const seg = sliceRouteBetween(
                    mapData.geometry,
                    { latitude: current.latitude, longitude: current.longitude },
                    { latitude: next.latitude, longitude: next.longitude },
                );
                if (seg.length >= 2) segs = [seg];
            } else if (roadGeometry) {
                geoms = [roadGeometry];
            } else {
                segs = [[
                    [current.longitude, current.latitude],
                    [next.longitude, next.latitude],
                ]];
            }
        }

        return { points: pts, geometries: geoms, coordinateSegments: segs };
    }, [current, next, currentIdx, roadGeometry, mapData, routes, latitude, longitude, customerName, variant]);

    return (
        <Map
            variant={variant}
            height={height}
            points={points}
            geometries={geometries}
            coordinateSegments={coordinateSegments}
            routeColor={ROUTE_COLOR}
            routeWidth={4}
            customerName={customerName}
            addressText={addressText}
            userLocation={userLocation}
        />
    );
}
