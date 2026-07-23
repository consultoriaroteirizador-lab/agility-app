export type OfferPayload = { id: string; code?: string; offerTime?: string; totalServices?: number; totalDistanceKm?: number; totalDurationMinutes?: number; totalValue?: number; originLat?: number; originLng?: number };
export type PendingOffer = OfferPayload & { receivedAt: number };

// offerTime "HH:mm" = duração (min:seg) da oferta; expira em receivedAt + dur.
// Quando ausente/vazio/"00:00" (duração zero), assume um fallback de 60s para
// que a oferta não nasça expirada (dead-on-arrival).
const FALLBACK_DURATION_MS = 60_000;
export function expiresAtOf(o: PendingOffer): number {
    const [m, s] = (o.offerTime ?? '').trim().split(':').map(Number);
    const durMs = ((m || 0) * 60 + (s || 0)) * 1000;
    return o.receivedAt + (durMs > 0 ? durMs : FALLBACK_DURATION_MS);
}
export function addOffer(list: PendingOffer[], offer: OfferPayload, now: number): PendingOffer[] {
    if (list.some((x) => x.id === offer.id)) return list;
    return [...list, { ...offer, receivedAt: now }];
}
export function dropOffer(list: PendingOffer[], id: string): PendingOffer[] {
    return list.filter((x) => x.id !== id);
}
export function pruneExpired(list: PendingOffer[], now: number): PendingOffer[] {
    return list.filter((x) => expiresAtOf(x) > now);
}
export function activeOffer(list: PendingOffer[]): PendingOffer | undefined {
    return list[0];
}
