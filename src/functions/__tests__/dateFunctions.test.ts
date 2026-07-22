import { formatRouteDate } from '@/app/(auth)/(tabs)/_rotas/utils/format';
import { formatDateOnly } from '@/utils/formatDate';

import { parseCalendarDay } from '../dateFunctions';

// Fixa o fuso: o bug de dia-calendário só aparece em offset negativo
// (America/Sao_Paulo, UTC-3). As funções sob teste criam Date em tempo de CHAMADA
// (dentro dos it), não no import, então definir process.env.TZ aqui basta — Node
// relê o TZ em runtime.
process.env.TZ = 'America/Sao_Paulo';

describe('parseCalendarDay', () => {
    // Meia-noite LOCAL de 22/07 em UTC-3 = 22/07 03:00 UTC.
    const EXPECTED = '2026-07-22T03:00:00.000Z';

    it('string YYYY-MM-DD → meia-noite local do dia (sem deslocar fuso)', () => {
        expect(parseCalendarDay('2026-07-22')!.toISOString()).toBe(EXPECTED);
    });

    it('string ISO em meia-noite UTC → mesmo dia (não volta 1 dia em UTC-3)', () => {
        const d = parseCalendarDay('2026-07-22T00:00:00.000Z')!;
        expect(d.toISOString()).toBe(EXPECTED);
        expect(d.getDate()).toBe(22); // dia local preservado, não 21
    });

    it('Date em meia-noite UTC → mesmo dia', () => {
        const d = parseCalendarDay(new Date('2026-07-22T00:00:00.000Z'))!;
        expect(d.toISOString()).toBe(EXPECTED);
    });

    it('nulo/vazio/ inválido → null', () => {
        expect(parseCalendarDay(null)).toBeNull();
        expect(parseCalendarDay(undefined)).toBeNull();
        expect(parseCalendarDay('')).toBeNull();
        expect(parseCalendarDay('not-a-date')).toBeNull();
    });
});

describe('formatDateOnly (histórico) — dia-calendário', () => {
    it('meia-noite UTC → dia correto, sem voltar 1 dia', () => {
        expect(formatDateOnly('2026-07-22T00:00:00.000Z')).toBe('22/07/2026');
    });
});

describe('formatRouteDate — dia da rota sem hora fictícia', () => {
    it('data não-hoje/amanhã: mostra dia correto, SEM hora nem separador', () => {
        // 2020-03-15 (domingo) — instante de meia-noite UTC. Não é hoje/amanhã.
        const out = formatRouteDate('2020-03-15T00:00:00.000Z')!;
        expect(out).toContain('15/03'); // dia certo (não 14/03)
        expect(out).not.toContain('14/03'); // não deslocou pro dia anterior
        expect(out).not.toContain(':'); // sem hora fictícia
        expect(out).not.toContain('·'); // sem o separador de hora antigo
    });

    it('valor nulo → null', () => {
        expect(formatRouteDate(null)).toBeNull();
    });
});
