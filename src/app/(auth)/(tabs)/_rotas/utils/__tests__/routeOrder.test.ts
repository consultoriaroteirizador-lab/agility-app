import { RoutingStatus } from '@/domain/agility/routing/dto/types';

import type { SortableRoute } from '../routeOrder';
import { resolveRouteStartTime, sortRoutesForDriver } from '../routeOrder';

/**
 * A suíte roda fixada em America/Sao_Paulo (test/setup-timezone.ts), que é
 * justamente o offset NEGATIVO onde o bug de dia-calendário aparece: um `date`
 * de meia-noite UTC lido como instante volta para as 21:00 do dia ANTERIOR e
 * inverte a ordem de duas rotas de dias diferentes.
 */

type RotaParcial = Partial<Omit<SortableRoute, 'date'>> &
    Pick<SortableRoute, 'code'> & { date?: Date | string | null };

function rota(partial: RotaParcial): SortableRoute {
    return {
        status: RoutingStatus.ASSIGNED,
        date: '2026-09-21T00:00:00.000Z',
        ...partial,
    } as SortableRoute;
}

const codigos = (routes: SortableRoute[]) => routes.map(r => r.code);

describe('resolveRouteStartTime', () => {
    it('usa startedAt quando a rota já saiu', () => {
        const start = resolveRouteStartTime(
            rota({
                code: 'R1',
                startedAt: '2026-09-21T13:00:00.000Z',
                plannedStartAt: '2026-09-21T11:00:00.000Z',
            })
        );

        expect(start).toBe(new Date('2026-09-21T13:00:00.000Z').getTime());
    });

    it('sem startedAt, usa plannedStartAt', () => {
        const start = resolveRouteStartTime(
            rota({ code: 'R1', plannedStartAt: '2026-09-21T11:00:00.000Z' })
        );

        expect(start).toBe(new Date('2026-09-21T11:00:00.000Z').getTime());
    });

    // O caso do fuso: `date` é dia-calendário gravado como meia-noite UTC. Lido
    // como instante em UTC-3, viraria 20/09 às 21:00 — um dia antes.
    it('sem hora nenhuma, usa o DIA de date sem deslocar o fuso', () => {
        const start = resolveRouteStartTime(rota({ code: 'R1', date: '2026-09-21T00:00:00.000Z' }));

        expect(start).toBe(new Date(2026, 8, 21, 0, 0, 0, 0).getTime());
    });

    it('devolve null quando não há nenhuma data', () => {
        expect(resolveRouteStartTime(rota({ code: 'R1', date: null }))).toBeNull();
    });
});

describe('sortRoutesForDriver', () => {
    it('lista vazia continua vazia', () => {
        expect(sortRoutesForDriver([])).toEqual([]);
    });

    // A regra que já existia e não pode regredir: a rota que o motorista está
    // fazendo AGORA fica no topo, ainda que tenha começado depois das outras.
    it('rota em andamento no topo mesmo com início posterior', () => {
        const lista = [
            rota({ code: 'MANHA', plannedStartAt: '2026-09-21T10:00:00.000Z' }),
            rota({
                code: 'TARDE',
                status: RoutingStatus.IN_PROGRESS,
                plannedStartAt: '2026-09-21T19:00:00.000Z',
                startedAt: '2026-09-21T19:05:00.000Z',
            }),
        ];

        expect(codigos(sortRoutesForDriver(lista))).toEqual(['TARDE', 'MANHA']);
    });

    it('ordena pelo plannedStartAt, do mais próximo para o mais distante', () => {
        const lista = [
            rota({ code: 'C', plannedStartAt: '2026-09-21T17:00:00.000Z' }),
            rota({ code: 'A', plannedStartAt: '2026-09-21T10:00:00.000Z' }),
            rota({ code: 'B', plannedStartAt: '2026-09-21T13:30:00.000Z' }),
        ];

        expect(codigos(sortRoutesForDriver(lista))).toEqual(['A', 'B', 'C']);
    });

    // Sem a leitura de dia-calendário, a rota de 22/09 (meia-noite UTC = 21/09
    // às 21:00 local) apareceria ANTES da de hoje às 14:00 local.
    it('fallback para date sem hora não desloca o dia', () => {
        const lista = [
            rota({ code: 'AMANHA', date: '2026-09-22T00:00:00.000Z' }),
            rota({
                code: 'HOJE_TARDE',
                date: '2026-09-21T00:00:00.000Z',
                plannedStartAt: '2026-09-21T17:00:00.000Z',
            }),
            rota({ code: 'HOJE_SEM_HORA', date: '2026-09-21T00:00:00.000Z' }),
        ];

        expect(codigos(sortRoutesForDriver(lista))).toEqual([
            'HOJE_SEM_HORA',
            'HOJE_TARDE',
            'AMANHA',
        ]);
    });

    // Sem desempate, duas rotas do mesmo horário ficavam na ordem em que a API
    // devolveu e a lista trocava de ordem a cada refetch (a home refetcha a
    // cada foco).
    it('desempata pelo código quando o início é o mesmo', () => {
        const mesmaHora = '2026-09-21T11:00:00.000Z';
        const lista = [
            rota({ code: 'R-3', plannedStartAt: mesmaHora }),
            rota({ code: 'R-1', plannedStartAt: mesmaHora }),
            rota({ code: 'R-2', plannedStartAt: mesmaHora }),
        ];

        expect(codigos(sortRoutesForDriver(lista))).toEqual(['R-1', 'R-2', 'R-3']);
        // Entrada invertida, saída IGUAL — é isso que faz a lista parar de dançar.
        expect(codigos(sortRoutesForDriver([...lista].reverse()))).toEqual(['R-1', 'R-2', 'R-3']);
    });

    it('rota sem nenhuma data vai para o fim, e não some da lista', () => {
        const lista = [
            rota({ code: 'SEM_DATA', date: null }),
            rota({ code: 'COM_HORA', plannedStartAt: '2026-09-21T11:00:00.000Z' }),
        ];

        const ordenada = sortRoutesForDriver(lista);

        expect(codigos(ordenada)).toEqual(['COM_HORA', 'SEM_DATA']);
        expect(ordenada).toHaveLength(2);
    });

    it('não muta a lista recebida', () => {
        const lista = [
            rota({ code: 'B', plannedStartAt: '2026-09-21T17:00:00.000Z' }),
            rota({ code: 'A', plannedStartAt: '2026-09-21T10:00:00.000Z' }),
        ];

        const ordenada = sortRoutesForDriver(lista);

        expect(codigos(lista)).toEqual(['B', 'A']);
        expect(ordenada).not.toBe(lista);
    });
});
