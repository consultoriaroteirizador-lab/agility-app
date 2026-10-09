import type { RoutingResponse } from '@/domain/agility/routing/dto';
import { RoutingStatus } from '@/domain/agility/routing/dto/types';

const STATUS_DO_HISTORICO: string[] = [RoutingStatus.COMPLETED, RoutingStatus.CANCELLED];

type RotaDoHistorico = Pick<RoutingResponse, 'id' | 'status' | 'completedAt' | 'startedAt' | 'date' | 'createdAt'>;

/** Quando a rota "aconteceu": conclusão, senão início, senão o dia da rota, senão a criação. */
function momento(rota: RotaDoHistorico): number {
    const quando = rota.completedAt ?? rota.startedAt ?? rota.date ?? rota.createdAt;
    const ms = quando ? new Date(quando).getTime() : NaN;
    return Number.isNaN(ms) ? 0 : ms;
}

/**
 * Rotas do histórico: concluídas e canceladas, da mais recente para a mais antiga.
 *
 * O `GET /routings/my-routings` não ordena, e a lista vinha misturando outubro, julho e
 * março (rodada de 09/10/2026). A ordem é feita aqui porque o mesmo endpoint alimenta a
 * tela inicial, que tem a sua própria ordem (`sortRoutesForDriver`).
 */
export function rotasDoHistorico<T extends RotaDoHistorico>(rotas: T[]): T[] {
    return rotas
        .filter((r) => STATUS_DO_HISTORICO.includes(r.status))
        .sort((a, b) => momento(b) - momento(a));
}
