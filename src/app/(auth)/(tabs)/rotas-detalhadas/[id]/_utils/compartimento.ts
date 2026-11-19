import type { RoutingResponse } from '@/domain/agility/routing/dto';

type EntradaDoPlano = { trailerPlate: string | null; compartment: number | null };

/**
 * Total de compartimentos da composição (mesma regra do painel): com carretas, a soma de
 * `trailers[].compartments ?? 1`; senão `vehicle.compartments ?? 1`. Backend antigo não manda: 1.
 */
export function totalCompartimentos(rota: RoutingResponse | null | undefined): number {
    const carretas = rota?.trailers ?? [];
    if (carretas.length > 0) return carretas.reduce((soma, t) => soma + (t.compartments ?? 1), 0);
    return rota?.vehicle?.compartments ?? 1;
}

/** Onde a linha vai no veículo; `null` quando não há o que escolher (1 compartimento) ou a linha não tem plano. */
export function formatCompartimento(entry: EntradaDoPlano | undefined, total: number): string | null {
    if (!entry || total <= 1) return null;
    if (entry.compartment == null) return 'Qualquer compartimento';
    if (entry.trailerPlate) return `Carreta ${entry.trailerPlate} · compartimento ${entry.compartment}`;
    return `Compartimento ${entry.compartment}`;
}
