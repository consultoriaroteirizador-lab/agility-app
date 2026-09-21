import { formatRouteSchedule } from '../format';

/**
 * O rótulo de data do card precisa falar do MESMO campo que ordena a lista
 * (`routeOrder.ts`). Suíte fixada em America/Sao_Paulo — ver
 * test/setup-timezone.ts.
 */
describe('formatRouteSchedule', () => {
    beforeAll(() => {
        // 21/09/2026, 09:00 no fuso da operação (UTC-3).
        jest.useFakeTimers().setSystemTime(new Date('2026-09-21T12:00:00.000Z'));
    });

    afterAll(() => {
        jest.useRealTimers();
    });

    it('mostra o dia e a HORA planejada quando há plannedStartAt', () => {
        expect(
            formatRouteSchedule({
                date: '2026-09-21T00:00:00.000Z',
                plannedStartAt: '2026-09-21T11:00:00.000Z',
            })
        ).toBe('Hoje · 08:00');
    });

    // Instante da noite: em UTC ele já é do dia 22, mas no fuso da operação
    // ainda é 21. Ler com getters locais do aparelho mandaria o rótulo para
    // "Amanhã" enquanto a ordenação continuaria tratando a rota como de hoje.
    it('usa o dia do fuso da operação, não o dia em UTC', () => {
        expect(
            formatRouteSchedule({
                date: '2026-09-21T00:00:00.000Z',
                plannedStartAt: '2026-09-22T02:00:00.000Z',
            })
        ).toBe('Hoje · 23:00');
    });

    // Sem hora escolhida não há hora a mostrar: a "· 09:00" antiga era a
    // meia-noite-UTC de `date` vista no fuso do aparelho.
    it('sem plannedStartAt, cai no dia-calendário e não inventa hora', () => {
        expect(formatRouteSchedule({ date: '2026-09-21T00:00:00.000Z' })).toBe('Hoje');
        expect(formatRouteSchedule({ date: '2026-09-22T00:00:00.000Z' })).toBe('Amanhã');
    });

    it('dia distante sai como "abrev, dd/MM"', () => {
        expect(formatRouteSchedule({ date: '2026-09-25T00:00:00.000Z' })).toMatch(
            /^[^\s,]+, 25\/09$/
        );
    });

    it('sem nenhuma data devolve null (a UI esconde a linha)', () => {
        expect(formatRouteSchedule({ date: null as never })).toBeNull();
    });
});
