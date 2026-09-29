// src/app/(auth)/(tabs)/menu/ganhos/_utils/__tests__/paymentDisplay.test.ts
import { debtCardState, describePayment } from '../paymentDisplay';

type P = Parameters<typeof describePayment>[0];

function pagamento(over: Partial<P> = {}): P {
    return {
        customerName: 'Mercado Bom Preço',
        serviceTitle: 'Entrega NF 123',
        routingId: '2f6c1c8e-1111-2222-3333-a1b2c3d4e5f6',
        routingCode: 'LMR-260920-A1',
        routingName: null,
        expectedValue: 15000,
        receivedValue: 15000,
        status: 'APPROVED',
        paymentDate: '2026-09-20T14:00:00.000Z',
        createdAt: '2026-09-20T14:05:00.000Z',
        ...over,
    } as P;
}

describe('describePayment', () => {
    it('rota pelo nome, depois pelo código — nunca pelo id', () => {
        expect(describePayment(pagamento({ routingName: 'Zona Sul manhã' })).route).toBe('Zona Sul manhã');
        expect(describePayment(pagamento()).route).toBe('LMR-260920-A1');
        expect(describePayment(pagamento({ routingCode: null })).route).toBeNull();
    });

    it('valor recebido, ou o esperado enquanto não recebeu', () => {
        expect(describePayment(pagamento()).amountCents).toBe(15000);
        expect(describePayment(pagamento({ receivedValue: undefined, status: 'PENDING' as P['status'] })).amountCents).toBe(15000);
    });

    // F5 (correção do review): SEMPRE `createdAt`, nunca `paymentDate` — o back
    // (`GET /finance/payments`) filtra o período pedido (Hoje/Semana/Mês/Ano) por
    // `createdAt`. Mostrar `paymentDate` podia exibir uma data fora do período escolhido.
    it('sempre a data de registro (createdAt) — nunca paymentDate, que não é o campo do filtro do back', () => {
        expect(describePayment(pagamento()).date).toBe('2026-09-20T14:05:00.000Z');
        // `paymentDate` nem faz mais parte do tipo lido por `describePayment` (ver `P` em
        // `paymentDisplay.ts`) — um valor divergente nele não pode vazar para `date`.
        const comPaymentDateDivergente = { ...pagamento(), paymentDate: '2026-01-01T00:00:00.000Z' };
        expect(describePayment(comPaymentDateDivergente).date).toBe('2026-09-20T14:05:00.000Z');
    });

    it('status em português', () => {
        expect(describePayment(pagamento()).status.label).toBe('Recebido');
        expect(describePayment(pagamento({ status: 'PENDING' as P['status'] })).status.label).toBe('Pendente');
        expect(describePayment(pagamento({ status: 'REJECTED' as P['status'] })).status.label).toBe('Recusado');
    });
});

describe('debtCardState', () => {
    it('erro sem dado NÃO vira "nada a devolver"', () => {
        expect(debtCardState(undefined, true)).toEqual({ kind: 'error' });
    });

    it('dado anterior continua valendo se só o refetch falhou', () => {
        expect(debtCardState({ totalPending: 3000, count: 1, overdueCount: 0 }, true)).toEqual({
            kind: 'debt',
            totalCents: 3000,
            count: 1,
            overdueCount: 0,
        });
    });

    it('sem dívida', () => {
        expect(debtCardState({ totalPending: 0, count: 0, overdueCount: 0 }, false)).toEqual({ kind: 'none' });
    });

    it('carregando', () => {
        expect(debtCardState(undefined, false)).toEqual({ kind: 'loading' });
    });
});
