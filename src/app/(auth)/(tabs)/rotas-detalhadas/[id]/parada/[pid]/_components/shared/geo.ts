/**
 * Helpers de geometria de rota compartilhados pelos mapas (Map.tsx e telas de
 * parada). Centraliza decode de polyline e o recorte de um trecho do traçado
 * global da roteirização — assim reusamos o caminho que segue as ruas que o
 * backend já calculou (orsRoute.geometry), sem precisar de ORS no app.
 *
 * Convenção: todas as coordenadas decodificadas são `[longitude, latitude]`
 * (formato esperado pelo MapLibre).
 */

/**
 * Decodifica uma encoded polyline com uma precisão específica
 * (5 = Google/ORS padrão, 6 = ORS alta precisão). Retorna `[lng, lat][]`.
 * @see https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */
function decodeWithPrecision(encoded: string, precision: number): number[][] {
    const coords: number[][] = [];
    const factor = Math.pow(10, precision);
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
        let shift = 0;
        let result = 0;
        let byte: number;

        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        lat += result & 1 ? ~(result >> 1) : result >> 1;

        shift = 0;
        result = 0;

        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        lng += result & 1 ? ~(result >> 1) : result >> 1;

        coords.push([lng / factor, lat / factor]);
    }

    return coords;
}

/**
 * Decodifica uma polyline tentando precisão 5 e, se as coordenadas saírem fora
 * do range válido, refaz com precisão 6 (o ORS pode emitir em qualquer das duas).
 * Retorna `[lng, lat][]` — vazio em string vazia.
 */
export function decodePolyline(encoded: string): number[][] {
    if (!encoded) return [];
    for (const precision of [5, 6]) {
        const coords = decodeWithPrecision(encoded, precision);
        const valid =
            coords.length > 1 &&
            coords.every(([lon, lat]) => Math.abs(lat) <= 90 && Math.abs(lon) <= 180);
        if (valid) return coords;
    }
    return decodeWithPrecision(encoded, 5);
}

/**
 * Simplifica uma polyline reduzindo a contagem de pontos (amostragem uniforme),
 * preservando primeiro e último. Evita render pesado em traçados longos.
 */
export function simplifyCoordinates(coords: number[][], maxPoints = 500): number[][] {
    if (coords.length <= maxPoints) return coords;

    const step = Math.ceil(coords.length / maxPoints);
    const simplified: number[][] = [coords[0]];
    for (let i = step; i < coords.length - 1; i += step) {
        simplified.push(coords[i]);
    }
    simplified.push(coords[coords.length - 1]);
    return simplified;
}

/** Índice do vértice mais próximo de (lng,lat) na lista de coords `[lng,lat][]`. */
function nearestIndex(coords: number[][], lng: number, lat: number): number {
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < coords.length; i++) {
        const dLng = coords[i][0] - lng;
        const dLat = coords[i][1] - lat;
        const d = dLng * dLng + dLat * dLat;
        if (d < bestDist) {
            bestDist = d;
            best = i;
        }
    }
    return best;
}

export interface LatLng {
    latitude: number;
    longitude: number;
}

/**
 * Recorta, do traçado global da rota, o trecho entre duas paradas consecutivas.
 * Como cada parada é um waypoint da rota, a polyline passa muito perto das suas
 * coordenadas — então achamos o vértice mais próximo de cada parada e fatiamos
 * entre eles (na ordem correta). Retorna `[lng,lat][]`.
 *
 * Fallbacks: se a geometria global não decodificar (ex.: rota antiga sem
 * traçado), devolve uma linha reta `[from, to]` — melhor ligar os pinos do que
 * nada.
 */
export function sliceRouteBetween(
    encodedGeometry: string | null | undefined,
    from: LatLng,
    to: LatLng,
): number[][] {
    const straight: number[][] = [
        [from.longitude, from.latitude],
        [to.longitude, to.latitude],
    ];

    const coords = encodedGeometry ? decodePolyline(encodedGeometry) : [];
    if (coords.length < 2) return straight;

    const iFrom = nearestIndex(coords, from.longitude, from.latitude);
    const iTo = nearestIndex(coords, to.longitude, to.latitude);
    if (iFrom === iTo) return straight;

    const start = Math.min(iFrom, iTo);
    const end = Math.max(iFrom, iTo);
    const slice = coords.slice(start, end + 1);

    // Mantém o sentido from → to (ex.: parada anterior → parada atual).
    const ordered = iFrom <= iTo ? slice : slice.slice().reverse();
    return ordered.length >= 2 ? ordered : straight;
}

/**
 * Divide o traçado global da rota (origem → paradas → retorno) em dois trechos
 * no ponto da ÚLTIMA parada: a IDA (início → última parada) e o RETORNO
 * (última parada → fim do traçado).
 *
 * Por que não usar `sliceRouteBetween` para o retorno: quando a rota volta à
 * origem, a coordenada da origem aparece nas DUAS pontas da polyline; o
 * "vértice mais próximo" do destino cairia no índice 0 (início) e o trecho de
 * retorno acabaria retraçando a ida. Aqui cortamos pelo índice da última parada
 * e usamos o final real do traçado como destino.
 *
 * Retorna `[lng,lat][]` para cada trecho. Quando a geometria não decodifica
 * (rota antiga sem traçado), devolve `null` — o chamador decide o fallback
 * (ex.: linhas retas ligando os pinos).
 */
export function splitRouteAtLastStop(
    encodedGeometry: string | null | undefined,
    lastStop: LatLng,
): { outbound: number[][]; returnLeg: number[][] } | null {
    const coords = encodedGeometry ? decodePolyline(encodedGeometry) : [];
    if (coords.length < 2) return null;

    const idx = nearestIndex(coords, lastStop.longitude, lastStop.latitude);
    const outbound = coords.slice(0, idx + 1);
    const returnLeg = coords.slice(idx);

    return {
        outbound: outbound.length >= 2 ? outbound : [],
        returnLeg: returnLeg.length >= 2 ? returnLeg : [],
    };
}
