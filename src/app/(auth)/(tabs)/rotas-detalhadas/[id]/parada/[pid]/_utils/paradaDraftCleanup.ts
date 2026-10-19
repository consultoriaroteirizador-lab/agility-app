export interface ParadaDraftCleaners {
    clearLocal: (serviceId: string) => Promise<unknown>;
    clearRemote: (serviceId: string) => Promise<unknown>;
}

/**
 * Apaga o rascunho da PARADA (etapa, evidência) do aparelho e do servidor. Best-effort:
 * falha de rede ou de storage nunca trava o fluxo, e um lado falhar não impede o outro.
 * Os apagadores vêm de fora para esta função não puxar módulos nativos (AsyncStorage).
 */
export async function clearParadaDraftEverywhere(
    serviceId: string | undefined,
    cleaners: ParadaDraftCleaners,
): Promise<void> {
    if (!serviceId) return;
    await Promise.allSettled([
        Promise.resolve().then(() => cleaners.clearLocal(serviceId)),
        Promise.resolve().then(() => cleaners.clearRemote(serviceId)),
    ]);
}
