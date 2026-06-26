/**
 * useRouteMapView - Monta os dados de mapa de uma rota (todas as paradas)
 *
 * Fonte única da lógica de visualização "todas as paradas no mapa", usada tanto
 * pelo modal de tela cheia (tela de paradas) quanto pelo mapa embutido do
 * histórico. Retorna:
 *  - `mapPoints`: origem ("O"/"O-F"), paradas numeradas (cor por status), retorno ("F")
 *  - `outboundSegments`: traçado da IDA (sólido) — origem → última parada
 *  - `dashedSegments`: traçado do RETORNO (tracejado) — última parada → origem/retorno
 *
 * Recorta os trechos do traçado global (`mapData.geometry`) com
 * `splitRouteAtLastStop`; sem geometria, cai para linhas retas ligando os pinos.
 *
 * @module rotas-detalhadas/shared
 */

import { useMemo } from 'react'

import { useGetRoutingMapData } from '@/domain/agility/routing/useCase'
import { ServiceStatus } from '@/domain/agility/service/dto/types'
import { colors } from '@/theme'

import { splitRouteAtLastStop, type LatLng } from './geo'
import { MapPoint } from './Map'

/** Cores dos pinos/legendas do mapa da rota. */
export const ROUTE_MAP_COLORS = {
    origin: '#10B981', // origem "O" / "O-F"
    return: '#EF4444', // retorno "F"
    done: colors.tertiary100, // concluída com sucesso
    fail: colors.redError, // insucesso / cancelada
    pending: colors.primary100, // pendente / em andamento
} as const

/** Cor do pino da parada conforme o status do serviço. */
export function stopColorByStatus(status?: string | null): string {
    switch (status) {
        case ServiceStatus.COMPLETED:
            return ROUTE_MAP_COLORS.done
        case ServiceStatus.FAILED:
        case ServiceStatus.CANCELED:
            return ROUTE_MAP_COLORS.fail
        default:
            return ROUTE_MAP_COLORS.pending
    }
}

export interface RouteMapView {
    /** Pinos teardrop prontos para o `<Map>`. */
    mapPoints: MapPoint[]
    /** Trecho de ida (sólido) para `coordinateSegments`. */
    outboundSegments: number[][][]
    /** Trecho de retorno (tracejado) para `dashedSegments`. */
    dashedSegments: number[][][]
    /** Carregando os dados do mapa. */
    isLoading: boolean
    /** Há ao menos um pino com localização. */
    hasPoints: boolean
}

export function useRouteMapView(routeId: string): RouteMapView {
    const { mapData, services, origin, isLoading } = useGetRoutingMapData(routeId)

    // Paradas ordenadas e com coordenadas válidas
    const sortedServices = useMemo(
        () =>
            [...services]
                .filter(s => s.latitude != null && s.longitude != null)
                .sort((a, b) => (a.sequenceOrder ?? 999) - (b.sequenceOrder ?? 999)),
        [services],
    )

    const returnPoint = mapData?.return
    const returnToOrigin = mapData?.returnToOrigin ?? false
    const hasOrigin = origin?.latitude != null && origin?.longitude != null
    const hasReturn =
        !returnToOrigin && returnPoint?.latitude != null && returnPoint?.longitude != null

    // Pinos: origem ("O"/"O-F"), paradas numeradas (cor por status), retorno ("F")
    const mapPoints = useMemo<MapPoint[]>(() => {
        const points: MapPoint[] = []

        if (hasOrigin) {
            points.push({
                id: 'origin',
                latitude: origin!.latitude!,
                longitude: origin!.longitude!,
                title: 'Origem',
                label: returnToOrigin ? 'O-F' : 'O',
                color: ROUTE_MAP_COLORS.origin,
            })
        }

        sortedServices.forEach((service, index) => {
            points.push({
                id: service.id,
                latitude: service.latitude,
                longitude: service.longitude,
                title: service.title || `Parada ${index + 1}`,
                label: index + 1,
                color: stopColorByStatus(service.status),
            })
        })

        if (hasReturn) {
            points.push({
                id: 'return',
                latitude: returnPoint!.latitude!,
                longitude: returnPoint!.longitude!,
                title: 'Retorno',
                label: 'F',
                color: ROUTE_MAP_COLORS.return,
            })
        }

        return points
    }, [hasOrigin, origin, returnToOrigin, sortedServices, hasReturn, returnPoint])

    // Traçado: ida sólida + retorno tracejado, recortados do traçado global.
    const { outboundSegments, dashedSegments } = useMemo(() => {
        const geometry = mapData?.geometry
        const lastStop = sortedServices[sortedServices.length - 1]

        if (!hasOrigin || !lastStop) {
            return { outboundSegments: [] as number[][][], dashedSegments: [] as number[][][] }
        }

        const originLatLng: LatLng = { latitude: origin!.latitude!, longitude: origin!.longitude! }
        const lastLatLng: LatLng = { latitude: lastStop.latitude, longitude: lastStop.longitude }
        const returnTarget: LatLng | null = returnToOrigin
            ? originLatLng
            : hasReturn
                ? { latitude: returnPoint!.latitude!, longitude: returnPoint!.longitude! }
                : null

        const split = splitRouteAtLastStop(geometry, lastLatLng)

        if (split) {
            return {
                outboundSegments: split.outbound.length > 1 ? [split.outbound] : [],
                // Só desenha o retorno tracejado se a rota de fato retorna.
                dashedSegments:
                    returnTarget && split.returnLeg.length > 1 ? [split.returnLeg] : [],
            }
        }

        // Fallback sem geometria: linhas retas ligando origem → última parada → retorno.
        const straightOutbound: number[][] = [
            [originLatLng.longitude, originLatLng.latitude],
            [lastLatLng.longitude, lastLatLng.latitude],
        ]
        const straightDashed: number[][] | null = returnTarget
            ? [
                [lastLatLng.longitude, lastLatLng.latitude],
                [returnTarget.longitude, returnTarget.latitude],
            ]
            : null

        return {
            outboundSegments: [straightOutbound],
            dashedSegments: straightDashed ? [straightDashed] : [],
        }
    }, [mapData?.geometry, sortedServices, hasOrigin, origin, returnToOrigin, hasReturn, returnPoint])

    return {
        mapPoints,
        outboundSegments,
        dashedSegments,
        isLoading,
        hasPoints: mapPoints.length > 0,
    }
}
