import type { RoutingStatus, OfferType, RoutingType } from '../types'

/**
 * Return point structure
 */
export interface ReturnPoint {
    latitude: number | null
    longitude: number | null
    address: string | null
}

/**
 * Ajudante escalado para UMA viagem (`routing_helpers`) — a tripulação daquela
 * rota, montada pelo operador. Não confundir com a equipe fixa de cadastro
 * (`Team`/`TeamMember`), que é outra pergunta e outro endpoint.
 *
 * `id` é o id da LINHA de `routing_helpers`, não o da pessoa.
 * Exatamente um entre `collaboratorId` e `providerId` vem preenchido
 * (ajudante pode ser funcionário ou terceirizado).
 */
export interface RoutingHelperResponse {
    id: string
    collaboratorId: string | null
    providerId: string | null
    helperName: string | null
    /** Só vem do `GET /routings/:id`; ausente enquanto o backend não estiver deployado. */
    helperPhone?: string | null
}

/**
 * Routing response DTO
 * Maps to RoutingEntity.toJson() from backend
 */
export interface RoutingResponse {
    /** Routing unique identifier */
    id: string

    /** Routing code */
    code: string

    /** Routing name */
    name: string | null

    /** Description */
    description: string | null

    /** Routing date */
    date: Date | string

    /** Status */
    status: RoutingStatus

    /** Driver ID */
    driverId: string | null

    /** Vehicle ID */
    vehicleId: string | null

    /** Is public offer (broadcast) */
    publicOffer: boolean

    /** Offer type */
    offerType: OfferType | null

    /** Routing type (SERVICE or PRODUCT) — campo APOSENTADO: o ERP não envia e
     *  o backend não lê. Nulo em 86% das rotas. Só sobrevive como fallback de
     *  legado; para saber a natureza da rota use `routingProfile`. */
    routingType: RoutingType | null

    /**
     * Perfil da roteirização — o campo VIVO (`LAST_MILE` | `FIELD_SERVICE` |
     * `PICKUP_DELIVERY`). O backend já o envia no `toJson`; este contrato é que
     * não o declarava, então o app decidia o badge pelo `routingType` nulo e
     * mostrava "Entrega" para toda rota de serviço em campo.
     */
    routingProfile: string | null

    /** Offer time limit */
    offerTime: string | null

    /** Total value */
    totalValue: number | null

    /** Broadcast radius in km */
    broadcastRadiusKm: number | null

    /** Total services */
    totalServices: number | null

    /** Total distance in km */
    totalDistanceKm: number | null

    /** Total duration in minutes */
    totalDurationMinutes: number | null

    /** Origin latitude */
    originLatitude: number | null

    /** Origin longitude */
    originLongitude: number | null

    /** Origin address */
    originAddress: string | null

    /** Origin address ID */
    originAddressId: string | null

    /** Return latitude */
    returnLatitude: number | null

    /** Return longitude */
    returnLongitude: number | null

    /** Return address */
    returnAddress: string | null

    /** Return address ID */
    returnAddressId: string | null

    /** Return to origin */
    returnToOrigin: boolean

    /** Has origin */
    hasOrigin: boolean

    /** Has return */
    hasReturn: boolean

    /** Id do Service RETURN materializado no handoff (trecho de malha em retorno).
     *  Presente ⇒ o handoff já ocorreu e o motorista deve seguir pro check-in de
     *  retorno em vez de repetir a entrega da transferência. */
    returnServiceId?: string | null

    /** Return point */
    returnPoint: ReturnPoint

    /** Started at timestamp */
    startedAt: Date | string | null

    /** Completed at timestamp */
    completedAt: Date | string | null

    /** Actual duration in minutes */
    actualDurationMinutes: number | null

    /** Is draft */
    isDraft: boolean

    /** Is pending assignment */
    isPendingAssignment: boolean

    /** Is broadcasting */
    isBroadcasting: boolean

    /** Is assigned */
    isAssigned: boolean

    /** Is in progress */
    isInProgress: boolean

    /** Is completed */
    isCompleted: boolean

    /** Is cancelled */
    isCancelled: boolean

    /** Has driver */
    hasDriver: boolean

    /** Has vehicle */
    hasVehicle: boolean

    /** Cross-docking: papel do trecho na malha. null/undefined em rota comum. */
    legType?: 'TRANSFER' | 'LAST_MILE' | null
    /** Cross-docking: rota-mãe da malha. */
    parentRoutingId?: string | null
    /** Cross-docking: próximo trecho na cadeia (last-mile ou próximo CD). */
    nextLegRoutingId?: string | null
    /** Cross-docking: nome do CD de origem do trecho (faixa de hops). */
    originFacilityName?: string | null
    /** Cross-docking: nome do CD de destino do trecho. */
    destinationFacilityName?: string | null

    /** Cross-docking: nº de pedidos do lote sendo transportados neste trecho de
     *  TRANSFERÊNCIA. Diferente de `totalServices` (que é 0 num transfer, pois o
     *  trecho não tem paradas de entrega). O backend precisa incluir este contador
     *  no payload leve de GET /routings para os trechos com legType === 'TRANSFER'.
     *  Ausente/null em rota comum e enquanto o backend não o expuser. */
    transferOrdersCount?: number | null
    /** Cross-docking: id do CD de destino do trecho (resolve coords via distribution-centers). */
    destinationFacilityId?: string | null

    /** Ajudantes da viagem. Só o `GET /routings/:id` embute; o payload leve das
     *  listagens não traz. Ausente também enquanto o backend não subir. */
    helpers?: RoutingHelperResponse[]

    /** Creation timestamp */
    createdAt: Date | string

    /** Last update timestamp */
    updatedAt: Date | string
}



