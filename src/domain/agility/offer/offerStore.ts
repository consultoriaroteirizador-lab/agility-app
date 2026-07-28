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
// Preserva a referência quando nada expirou: a fila é lida a cada tique de 1s e
// um array novo por tique churnaria render à toa.
export function pruneExpired(list: PendingOffer[], now: number): PendingOffer[] {
    const kept = list.filter((x) => expiresAtOf(x) > now);
    return kept.length === list.length ? list : kept;
}
// Marca o silêncio na fila. Idempotente e, para quem repovoa a fila com a
// mesma fila (polling/WS), inofensivo: o dedup por id de `addOffer` já barra a
// duplicata. Contra o esvaziamento da fila quem responde é `applySilenced`,
// logo abaixo — este aqui é só a primitiva.
export function silenceOffer(list: PendingOffer[], id: string, now: number): PendingOffer[] {
    if (!list.some((x) => x.id === id && x.silencedAt === undefined)) return list;
    return list.map((x) => (x.id === id ? { ...x, silencedAt: now } : x));
}

// ─── Memória de ofertas dispensadas ──────────────────────────────────────────
// Dispensar tem duas portas — "Ver detalhes" (decido depois) e "Recusar"
// (decidi que não) — e uma consequência só: não alertar mais este id neste
// aparelho. Por isso um conceito só, e não dois.
//
// A fila é estado volátil: ela é esvaziada inteira quando o motorista fica
// indisponível, e é repovoada de fora pelo poll/WS. O conjunto de ids que ele
// já dispensou NÃO pode morrer junto, senão a mesma oferta reentra sem o
// silêncio e o alerta reabre — por cima da tela de detalhe que ele está lendo,
// ou insistindo no que ele acabou de recusar. Esta memória é a fonte da
// verdade do silêncio; o flag na fila é derivado dela.
//   at    = quando foi silenciada (vira o `silencedAt` ao reaplicar)
//   until = até quando vale lembrar dela mesmo fora da fila
export type SilencedOffers = Record<string, { at: number; until: number }>;

export function rememberSilenced(memory: SilencedOffers, offer: PendingOffer, now: number): SilencedOffers {
    return { ...memory, [offer.id]: { at: memory[offer.id]?.at ?? now, until: expiresAtOf(offer) } };
}

// Reaplica o silêncio às ofertas que reentraram na fila depois de um
// esvaziamento. Devolve a mesma lista quando não há nada a marcar.
export function applySilenced(list: PendingOffer[], memory: SilencedOffers): PendingOffer[] {
    return Object.entries(memory).reduce((acc, [id, { at }]) => silenceOffer(acc, id, at), list);
}

// Coleta de lixo da memória, para o conjunto não crescer sem limite:
//  - oferta ainda na fila continua lembrada, com o prazo RENOVADO a partir dela
//    (ao reentrar, a oferta ganha um `receivedAt` novo e portanto um prazo novo;
//    sem renovar, a memória venceria antes da oferta e o alerta voltaria);
//  - oferta fora da fila é esquecida assim que o prazo passa.
export function forgetSilenced(memory: SilencedOffers, list: PendingOffer[], now: number): SilencedOffers {
    const naFila = new Map(list.map((o) => [o.id, expiresAtOf(o)]));
    let mudou = false;
    const next: SilencedOffers = {};
    for (const [id, entry] of Object.entries(memory)) {
        const prazoNaFila = naFila.get(id);
        if (prazoNaFila !== undefined) {
            next[id] = prazoNaFila === entry.until ? entry : { ...entry, until: prazoNaFila };
            mudou = mudou || next[id] !== entry;
        } else if (entry.until > now) {
            next[id] = entry;
        } else {
            mudou = true; // esquecida de vez
        }
    }
    return mudou ? next : memory;
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
