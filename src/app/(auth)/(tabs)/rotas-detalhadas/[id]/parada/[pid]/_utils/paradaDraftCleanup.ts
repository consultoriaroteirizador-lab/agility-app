export interface ParadaDraftCleaners {
    clearLocal: (serviceId: string) => Promise<unknown>;
    clearRemote: (serviceId: string) => Promise<unknown>;
}

/**
 * Apaga o rascunho da PARADA (etapa, evidência) do aparelho e do servidor. Best-effort:
 * falha de rede ou de storage nunca trava o fluxo, e um lado falhar não impede o outro.
 * Só a limpeza local é aguardada; a do servidor é disparada sem esperar.
 * Os apagadores vêm de fora para esta função não puxar módulos nativos (AsyncStorage).
 */
export async function clearParadaDraftEverywhere(
    serviceId: string | undefined,
    cleaners: ParadaDraftCleaners,
): Promise<void> {
    if (!serviceId) return;
    // O servidor sai sem bloquear: com rede degradada o DELETE levaria até o timeout e
    // seguraria a navegação com a ocorrência já registrada. Só o local é aguardado.
    void Promise.resolve()
        .then(() => cleaners.clearRemote(serviceId))
        .catch(() => undefined);
    await Promise.resolve()
        .then(() => cleaners.clearLocal(serviceId))
        .catch(() => undefined);
}
