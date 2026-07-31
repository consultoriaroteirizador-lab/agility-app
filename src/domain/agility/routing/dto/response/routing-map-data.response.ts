import type { RoutingStatus } from '../types'

/**
 * Service point - apenas dados essenciais para o mapa
 */
export interface ServicePointResponse {
    /** Service ID */
    id: string

    /** Sequence order in routing */
    sequenceOrder: number

    /** Latitude */
    latitude: number

    /** Longitude */
    longitude: number

    /** Service title */
    title?: string | null

    /** Service type */
    serviceType?: string | null

    /** Service status */
    status?: string | null

    /**
     * Identidade da PARADA (a porta), não do pedido. O backend já mandava estes
     * três campos em `buildServicePoints` — só não estavam declarados aqui, e por
     * isso o mapa agrupava por título (texto livre por pedido) em vez de por
     * endereço. Ver `_utils/stopGrouping.mapPointStopKeyOf`.
     *
     * `addressId` vem do acessor cru da entidade (`string | undefined`), então a
     * chave pode estar AUSENTE do JSON — daí ser opcional de verdade, e não só
     * "às vezes null". `customerId` não é enviado: o cliente é aproximado por
     * `fantasyName ?? responsible`, os mesmos fallbacks da lista de paradas.
     */
    addressId?: string | null

    /** Nome fantasia do cliente (identifica o recebedor no mapa). */
    fantasyName?: string | null

    /** Responsável pelo recebimento — fallback quando não há `fantasyName`. */
    responsible?: string | null

    /**
     * Fase de custódia (cross-docking): AT_ORIGIN | IN_TRANSIT | AT_HUB |
     * OUT_FOR_DELIVERY | DELIVERED | EXCEPTION. Pós-handoff, um pedido entregue no
     * CD fica AT_HUB+ com status ainda PENDING (segue no last-mile) — o gate do
     * retorno usa isto pra liberar o "Cheguei no retorno".
     */
    custodyPhase?: string | null
}

/**
 * Route segment - dados para renderizar trajeto no mapa
 */
export interface RouteSegmentResponse {
    /** Route ID */
    id: string

    /** Sequence order */
    sequenceOrder: number

    /** Origin service ID */
    originServiceId: string

    /** Destination service ID */
    destinationServiceId: string

    /** Distance in km */
    distanceKm?: number | null

    /** Duration in minutes */
    durationMinutes?: number | null

    /** Geometry (polyline encoded) */
    geometry?: string | null

    /** Route status */
    status?: string | null
}

/**
 * Origin/Return point
 */
export interface OriginPointResponse {
    /** Latitude */
    latitude?: number | null

    /** Longitude */
    longitude?: number | null

    /** Address description */
    address?: string | null
}

/**
 * Routing Map Data Response - dados otimizados para renderização no mapa
 * Payload leve: apenas lat/long dos services e geometry das routes
 */
export interface RoutingMapDataResponse {
    /** Routing ID */
    id: string

    /** Routing code */
    code: string

    /** Routing status */
    status: RoutingStatus

    /** Origin point */
    origin: OriginPointResponse

    /** Return point (if different from origin) */
    return?: OriginPointResponse | null

    /** Return to origin flag */
    returnToOrigin: boolean

    /** Services with coordinates only */
    services: ServicePointResponse[]

    /** Route segments with geometry */
    routes: RouteSegmentResponse[]

    /**
     * Geometria global da rota (polyline encoded do ORS), traçado completo
     * origem → paradas → retorno. Fallback usado quando os segmentos
     * (`routes[].geometry`) vêm nulos — que é o caso atual do backend.
     */
    geometry?: string | null

    /** Total distance in km */
    totalDistanceKm?: number | null

    /** Total duration in minutes */
    totalDurationMinutes?: number | null
}

