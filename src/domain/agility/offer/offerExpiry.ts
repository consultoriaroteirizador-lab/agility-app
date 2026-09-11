/**
 * Segundos até a oferta expirar, a partir do INSTANTE ABSOLUTO que o backend
 * grava ao divulgar (`offerExpiresAt`, ISO). `null` quando não há prazo
 * conhecido — oferta antiga ou backend anterior: mostra "sem prazo" e nunca
 * trava o Aceitar. `offerTime` não entra aqui: é duração do lado do servidor, e
 * lê-lo no app já rendeu três leituras diferentes do mesmo campo.
 */
export function segundosAteExpirar(offerExpiresAt: string | null | undefined, agora: number): number | null {
    if (!offerExpiresAt) return null;
    const ts = Date.parse(offerExpiresAt);
    if (Number.isNaN(ts)) return null;
    return Math.max(0, Math.floor((ts - agora) / 1000));
}
