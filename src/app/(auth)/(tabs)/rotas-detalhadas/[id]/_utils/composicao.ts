/**
 * Texto da composição da rota para o motorista.
 *
 * "Cavalo" quando há carretas (ou o veículo é um cavalo mecânico); "Veículo"
 * no caso comum. Devolve `null` sem veículo/placa: o chamador não renderiza
 * nada. Backend antigo não manda `vehicle`/`trailers` — mesmo caminho.
 */
export function formatComposicao(
    vehicle: { plate?: string; kind?: string } | null | undefined,
    trailers: { plate: string }[] | undefined,
): string | null {
    if (!vehicle?.plate) return null

    const carretas = trailers ?? []
    if (carretas.length === 0) {
        return `${vehicle.kind === 'TRACTOR' ? 'Cavalo' : 'Veículo'} ${vehicle.plate}`
    }

    const placas = carretas.map((t) => t.plate).join(', ')
    const rotulo = carretas.length === 1 ? 'carreta' : 'carretas'
    return `Cavalo ${vehicle.plate} · ${rotulo} ${placas}`
}
