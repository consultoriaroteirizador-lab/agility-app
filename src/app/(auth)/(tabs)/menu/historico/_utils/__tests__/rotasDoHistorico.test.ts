// Rodada de 09/10/2026: o histórico vinha sem ordem (o back não ordena) e só pedia COMPLETED,
// embora a tela prometa as canceladas também.
import { RoutingStatus } from '@/domain/agility/routing/dto/types';

import { rotasDoHistorico } from '../rotasDoHistorico';

type Rota = Parameters<typeof rotasDoHistorico>[0][number];

const rota = (id: string, over: Partial<Rota>): Rota =>
    ({ id, status: RoutingStatus.COMPLETED, date: '2026-09-01', createdAt: '2026-09-01T00:00:00Z', ...over }) as Rota;

it('só concluídas e canceladas, da mais recente para a mais antiga', () => {
    const lista = rotasDoHistorico([
        rota('julho', { completedAt: '2026-07-13T12:02:00Z' }),
        rota('em-andamento', { status: RoutingStatus.IN_PROGRESS, startedAt: '2026-10-09T08:00:00Z' }),
        rota('outubro', { completedAt: '2026-10-09T00:57:00Z' }),
        rota('cancelada', { status: RoutingStatus.CANCELLED, date: '2026-09-20', completedAt: null }),
        rota('setembro', { completedAt: '2026-09-18T02:53:00Z' }),
        rota('atribuida', { status: RoutingStatus.ASSIGNED }),
    ]);

    expect(lista.map((r) => r.id)).toEqual(['outubro', 'cancelada', 'setembro', 'julho']);
});

it('sem data de conclusão, usa a de início, depois o dia da rota e por fim a criação', () => {
    const lista = rotasDoHistorico([
        rota('so-criacao', { date: undefined as never, createdAt: '2026-08-01T00:00:00Z' }),
        rota('iniciada', { startedAt: '2026-09-05T10:00:00Z' }),
        rota('dia', { date: '2026-09-03' }),
    ]);

    expect(lista.map((r) => r.id)).toEqual(['iniciada', 'dia', 'so-criacao']);
});
