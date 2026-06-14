/**
 * Cliente leve do OpenRouteService Directions — calcula o traçado (que segue as
 * ruas) entre dois pontos sob demanda. Usado no mapa das paradas para ligar a
 * parada atual à próxima quando a geometria global da roteirização não está
 * disponível (o backend grava os segmentos como null).
 *
 * Mesma estratégia do platform web (MapaResultado): chamada direta ao ORS de
 * desenvolvimento. Quando houver um endpoint de direções no backend, basta
 * trocar a implementação de {@link fetchRouteGeometry} mantendo a assinatura.
 */

const ORS_DIRECTIONS_URL = 'https://dev.route.agilitylabs.com.br/ors/v2/directions/driving-car';
// Mesma key pública usada no bundle do platform web (ambiente de desenvolvimento).
const ORS_API_KEY = '5b3ce3597851110001cf624858b2dedc8078405280f0bcb3a756bd44';

export interface LatLng {
    latitude: number;
    longitude: number;
}

// Cache em memória por par origem|destino — evita refetch ao reabrir a tela.
const cache = new Map<string, string>();

const keyOf = (from: LatLng, to: LatLng) =>
    `${from.latitude.toFixed(5)},${from.longitude.toFixed(5)}|${to.latitude.toFixed(5)},${to.longitude.toFixed(5)}`;

/**
 * Retorna a polyline encoded (precisão 5) do trajeto origem → destino, ou null
 * em falha (o chamador cai em linha reta). Nunca lança.
 */
export async function fetchRouteGeometry(from: LatLng, to: LatLng): Promise<string | null> {
    const cacheKey = keyOf(from, to);
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
        const res = await fetch(ORS_DIRECTIONS_URL, {
            method: 'POST',
            headers: {
                Authorization: ORS_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                coordinates: [
                    [from.longitude, from.latitude],
                    [to.longitude, to.latitude],
                ],
                instructions: false,
                elevation: false,
            }),
        });

        if (!res.ok) return null;

        const data = await res.json();
        const geometry = data?.routes?.[0]?.geometry;
        if (typeof geometry === 'string' && geometry.length > 0) {
            cache.set(cacheKey, geometry);
            return geometry;
        }
        return null;
    } catch {
        return null;
    }
}
