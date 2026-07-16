/** Rastreamento liga quando o motorista está em rota ativa OU disponível (ocioso). */
export function shouldTrack(hasInProgressRoute: boolean, isAvailable: boolean): boolean {
    return hasInProgressRoute || isAvailable;
}

/**
 * Valor de disponibilidade a exibir: enquanto um toggle está pendente (otimista),
 * mostra o valor pedido; caso contrário, o valor autoritativo do servidor.
 */
export function resolveDisplayedAvailability(serverValue: boolean, pending: boolean | null): boolean {
    return pending !== null ? pending : serverValue;
}
