import type { RoutingResponse } from '@/domain/agility/routing/dto';
import { RoutingStatus } from '@/domain/agility/routing/dto/types';
import { parseCalendarDay } from '@/functions/dateFunctions';

/**
 * O recorte de rota que a ordenação precisa. Tipado por campo (e não como
 * `RoutingResponse` inteiro) para a função continuar testável com objetos
 * mínimos e não exigir as ~60 chaves do DTO em cada caso de teste.
 */
export type SortableRoute = Pick<RoutingResponse, 'status' | 'date' | 'code'> &
    Partial<Pick<RoutingResponse, 'plannedStartAt' | 'startedAt'>>;

type DateInput = Date | string | null | undefined;

function toTimestamp(value: DateInput): number | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    const time = date.getTime();
    return Number.isNaN(time) ? null : time;
}

/**
 * Início da rota em milissegundos, para comparação. `null` quando a rota não
 * tem nenhuma data utilizável — essas vão para o FIM da lista, nunca somem.
 *
 * A cascata (a mesma do backend em `route-departure.ts`, na ordem que faz
 * sentido para o motorista):
 *
 *  1. `startedAt` — a rota JÁ saiu; a hora real vence qualquer planejamento;
 *  2. `plannedStartAt` — o operador escolheu dia E hora (épico de 17–18/09/2026);
 *  3. `date` — só o DIA. Vale como "começo daquele dia".
 *
 * `date` é dia-calendário e o backend o grava como meia-noite UTC: lido como
 * instante, em UTC-3 ele volta para as 21:00 do dia ANTERIOR e a rota de
 * amanhã aparece antes da de hoje. Por isso passa por [parseCalendarDay], que
 * devolve a meia-noite LOCAL do dia certo. Os outros dois são instantes reais
 * e NÃO podem passar por lá (perderiam a hora).
 */
export function resolveRouteStartTime(route: SortableRoute): number | null {
    const started = toTimestamp(route.startedAt);
    if (started !== null) return started;

    const planned = toTimestamp(route.plannedStartAt);
    if (planned !== null) return planned;

    const day = parseCalendarDay(route.date);
    return day ? day.getTime() : null;
}

/**
 * Desempate estável: mesmo início ⇒ ordena pelo código da rota.
 *
 * Sem ele, duas rotas do mesmo horário ficavam na ordem em que o backend
 * devolveu, e a lista "dançava" a cada refetch (a home refetcha a cada foco).
 * Comparação de string crua de propósito — `localeCompare` depende do Intl do
 * aparelho e aqui o que importa é ser DETERMINÍSTICO, não alfabeticamente
 * perfeito em pt-BR.
 */
function compareCodes(a: SortableRoute, b: SortableRoute): number {
    const codeA = a.code ?? '';
    const codeB = b.code ?? '';
    if (codeA === codeB) return 0;
    return codeA < codeB ? -1 : 1;
}

/**
 * Ordem da lista de rotas da home do motorista.
 *
 * Regras, nesta ordem:
 *  1. rota EM ANDAMENTO no topo — é a que o motorista está fazendo agora, e ela
 *     sobe mesmo que tenha começado depois das outras;
 *  2. dentro de cada grupo, pelo início previsto (ver [resolveRouteStartTime]),
 *     do mais próximo para o mais distante;
 *  3. rota sem nenhuma data vai para o fim do grupo (some da vista seria pior);
 *  4. empate no início ⇒ código da rota, para a lista não dançar entre refetches.
 *
 * Antes disto, só a regra 1 existia: o resto ficava na ordem em que a API
 * devolveu, e o motorista via a rota da tarde acima da que sai às 07:00.
 *
 * Não muta a lista recebida (`FlatList` compara referência) e NÃO tem opinião
 * sobre a ordem das PARADAS dentro da rota — essa é `sequenceOrder`, decidida
 * na tela de detalhe.
 */
export function sortRoutesForDriver<T extends SortableRoute>(routes: T[]): T[] {
    return [...routes].sort((a, b) => {
        const aInProgress = a.status === RoutingStatus.IN_PROGRESS;
        const bInProgress = b.status === RoutingStatus.IN_PROGRESS;
        if (aInProgress !== bInProgress) return aInProgress ? -1 : 1;

        const startA = resolveRouteStartTime(a);
        const startB = resolveRouteStartTime(b);
        if (startA === null && startB !== null) return 1;
        if (startA !== null && startB === null) return -1;
        if (startA !== null && startB !== null && startA !== startB) {
            return startA - startB;
        }

        return compareCodes(a, b);
    });
}
