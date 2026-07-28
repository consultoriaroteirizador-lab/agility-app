export type OfferPayload = { id: string; code?: string; offerTime?: string; totalServices?: number; totalDistanceKm?: number; totalDurationMinutes?: number; totalValue?: number; originLat?: number; originLng?: number };
// `silencedAt` marca a oferta que o motorista escolheu ver em detalhe: ela
// continua na fila (válida, aceitável, visível na aba Ofertas), mas deixa de
// disparar o alerta global — senão o popup voltaria por cima da própria tela
// que ele abriu para decidir. Silenciar NÃO é recusar.
export type PendingOffer = OfferPayload & { receivedAt: number; silencedAt?: number };

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
// Silenciar é idempotente e definitivo enquanto a oferta viver: quem repovoa a
// fila (polling/WS) esbarra no dedup por id de `addOffer`, então o alerta não
// ressuscita. A silenciada morre junto com a oferta, no `pruneExpired`.
export function silenceOffer(list: PendingOffer[], id: string, now: number): PendingOffer[] {
    if (!list.some((x) => x.id === id && x.silencedAt === undefined)) return list;
    return list.map((x) => (x.id === id ? { ...x, silencedAt: now } : x));
}
export function isSilenced(offer: PendingOffer): boolean {
    return offer.silencedAt !== undefined;
}
// Oferta que deve alertar agora: a primeira da fila que ainda não foi
// silenciada. Uma segunda oferta que chegue enquanto a primeira está
// silenciada alerta normalmente.
export function activeOffer(list: PendingOffer[]): PendingOffer | undefined {
    return list.find((x) => !isSilenced(x));
}
