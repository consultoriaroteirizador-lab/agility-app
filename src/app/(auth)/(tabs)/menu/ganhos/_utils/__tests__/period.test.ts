// src/app/(auth)/(tabs)/menu/ganhos/_utils/__tests__/period.test.ts
// A suíte roda em America/Sao_Paulo (test/setup-timezone.ts): getters locais = horário de SP.
import { chartDataFor, periodStart } from '../period';

const agora = new Date(2026, 8, 24, 15, 30); // quinta, 24/09/2026 15:30

describe('periodStart', () => {
    it('hoje começa à meia-noite local', () => {
        expect(periodStart('today', agora)).toEqual(new Date(2026, 8, 24, 0, 0, 0, 0));
    });

    it('semana começa na segunda', () => {
        expect(periodStart('week', agora)).toEqual(new Date(2026, 8, 21, 0, 0, 0, 0));
    });

    it('mês e ano', () => {
        expect(periodStart('month', agora)).toEqual(new Date(2026, 8, 1, 0, 0, 0, 0));
        expect(periodStart('year', agora)).toEqual(new Date(2026, 0, 1, 0, 0, 0, 0));
    });
});

describe('chartDataFor', () => {
    it('agrupa por dia no mês, em ordem numérica, e converte centavos para REAIS', () => {
        const dados = chartDataFor(
            [
                { releasedAt: new Date(2026, 8, 10, 12).toISOString(), releasedCents: 15050 },
                { releasedAt: new Date(2026, 8, 2, 12).toISOString(), releasedCents: 10000 },
                { releasedAt: new Date(2026, 8, 10, 18).toISOString(), releasedCents: 50 },
            ],
            'month',
        );
        expect(dados.labels).toEqual(['2', '10']);
        expect(dados.datasets[0].data).toEqual([100, 151]);
    });

    it('sem itens mostra "Sem dados"', () => {
        expect(chartDataFor([], 'week')).toEqual({ labels: ['Sem dados'], datasets: [{ data: [0] }] });
    });
});
