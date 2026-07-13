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

// Cores: origem (verde), parada anterior já concluída (cinza) e trecho de rota.
const ORIGIN_COLOR = '#10B981'; // verde (mesma da origem no mapa da rota)
const PREV_STOP_COLOR = '#9CA3AF'; // cinza (parada anterior, esmaecida)
const ROUTE_COLOR = colors.primary100; // #7063F0 (mesmo do platform)

interface StopCoords {
    id: string;
    latitude: number;
    longitude: number;
    sequenceOrder: number;
}

/**
 * Mapa de uma parada que, além do pino da parada atual, traça o trecho que o
 * motorista percorre PARA CHEGAR nela: da parada ANTERIOR (ou da origem, quando
 * é a primeira parada) até a parada atual. Fonte do traçado, em ordem de
 * preferência:
 *   1. geometry do SEGMENTO exato (anterior→atual) vinda do map-data;
 *   2. recorte do traçado GLOBAL persistido (`mapData.geometry`);
 *   3. ORS Directions ao vivo (segue as ruas) — {@link useRouteDirections};
 *   4. linha reta entre os dois pontos (último recurso).
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
    const { mapData, routes, origin } = useGetRoutingMapData(routeId || '');

    // Resolve parada atual + ANTERIOR (com coordenadas) na ordem da sequência.
    // Para a 1ª parada, a "anterior" é a ORIGEM da rota.
    const { current, prev, currentIdx } = useMemo(() => {
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

        let previous: StopCoords | null = null;
        if (idx > 0) {
            previous = sorted[idx - 1];
        } else if (idx === 0 && origin?.latitude != null && origin?.longitude != null) {
            previous = { id: 'origin', latitude: origin.latitude, longitude: origin.longitude, sequenceOrder: -1 };
        }

        return {
            current: idx >= 0 ? sorted[idx] : null,
            prev: previous,
            currentIdx: idx,
        };
    }, [services, serviceId, origin]);

    // Traçado ao vivo (ORS) anterior → atual. Null enquanto carrega/falha.
    const roadGeometry = useRouteDirections(
        prev ? { latitude: prev.latitude, longitude: prev.longitude } : null,
        current ? { latitude: current.latitude, longitude: current.longitude } : null,
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

        if (prev) {
            const isOrigin = prev.id === 'origin';
            pts.push({
                id: prev.id,
                latitude: prev.latitude,
                longitude: prev.longitude,
                title: isOrigin ? 'Origem' : 'Parada anterior',
                color: isOrigin ? ORIGIN_COLOR : PREV_STOP_COLOR,
                size: 30,
                // Origem = "O"; senão, o número da parada anterior (= currentIdx).
                label: isOrigin ? 'O' : currentIdx,
            });

            // Ordem de preferência do traçado (mais fiel ao backend primeiro):
            // 1) geometry do SEGMENTO exato (anterior→atual) vindo do map-data;
            // 2) recorte do traçado GLOBAL persistido (map-data.geometry);
            // 3) ORS ao vivo (segue as ruas);
            // 4) linha reta.
            const segmentGeom = (routes ?? []).find(
                r => r.geometry &&
                    r.originServiceId === prev.id &&
                    r.destinationServiceId === current.id,
            )?.geometry;

            if (segmentGeom) {
                geoms = [segmentGeom];
            } else if (mapData?.geometry) {
                const seg = sliceRouteBetween(
                    mapData.geometry,
                    { latitude: prev.latitude, longitude: prev.longitude },
                    { latitude: current.latitude, longitude: current.longitude },
                );
                if (seg.length >= 2) segs = [seg];
            } else if (roadGeometry) {
                geoms = [roadGeometry];
            } else {
                segs = [[
                    [prev.longitude, prev.latitude],
                    [current.longitude, current.latitude],
                ]];
            }
        }

        return { points: pts, geometries: geoms, coordinateSegments: segs };
    }, [current, prev, currentIdx, roadGeometry, mapData, routes, latitude, longitude, customerName, variant]);

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
