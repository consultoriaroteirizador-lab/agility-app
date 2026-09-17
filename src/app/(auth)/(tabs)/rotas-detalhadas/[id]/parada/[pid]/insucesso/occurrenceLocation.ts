/**
 * GPS da ocorrência: de onde o motorista registrou a falha. Vira
 * `latitude`/`longitude`/`accuracy` na tentativa de entrega — a prova de campo
 * da falha — e é BEST-EFFORT: sem GPS a nota é registrada do mesmo jeito.
 *
 * O backend valida o PAR: latitude sem longitude responde 400. Por isso só o par
 * completo é enviado, e `latitude: 0` (coordenada legítima, no Equador ou em
 * Greenwich) não pode ser podada por teste de falsy.
 *
 * @module rotas-detalhadas/parada/insucesso/occurrenceLocation
 */

import type { CapturedCoords } from '../_hooks/getCurrentCoords'

export interface OccurrenceLocationPayload {
    latitude: number
    longitude: number
    accuracy?: number
}

export function coordsParaOcorrencia(
    coords: CapturedCoords | undefined | null,
): OccurrenceLocationPayload | null {
    if (!coords) return null
    if (!Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)) return null

    const payload: OccurrenceLocationPayload = {
        latitude: coords.latitude,
        longitude: coords.longitude,
    }
    if (Number.isFinite(coords.accuracy) && (coords.accuracy as number) >= 0) {
        payload.accuracy = coords.accuracy as number
    }
    return payload
}
