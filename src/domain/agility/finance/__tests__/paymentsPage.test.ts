// src/domain/agility/finance/__tests__/paymentsPage.test.ts
import { toPaymentsPage } from '../paymentsPage';

const pagamento = (id: string) => ({ id }) as never;

describe('toPaymentsPage', () => {
    it('resposta paginada do back vira página com page/totalPages', () => {
        const pagina = toPaymentsPage(
            { data: [pagamento('p1')], meta: { page: 2, limit: 50, totalItems: 120, totalPages: 3, hasNextPage: true, hasPreviousPage: true } },
            2,
        );
        expect(pagina).toEqual({ data: [{ id: 'p1' }], meta: { page: 2, totalPages: 3 } });
    });

    it('resposta legada em array é a última página', () => {
        expect(toPaymentsPage([pagamento('p1')], 1)).toEqual({ data: [{ id: 'p1' }], meta: { page: 1, totalPages: 1 } });
    });

    it('resposta vazia não quebra', () => {
        expect(toPaymentsPage(undefined, 1)).toEqual({ data: [], meta: { page: 1, totalPages: 1 } });
    });
});
