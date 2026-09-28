import { advanceDueText, advanceTitle } from '../advanceDisplay';

describe('advanceTitle', () => {
    it('dívida de cobrança em dinheiro não mostra o id do serviço', () => {
        const titulo = advanceTitle({ description: 'Dinheiro recebido no service 2f6c1c8e-1111-2222-3333-a1b2c3d4e5f6 — devolução pendente' });
        expect(titulo).toBe('Dinheiro recebido de cliente');
        expect(titulo).not.toContain('2f6c1c8e');
    });

    it('adiantamento do operador mantém a descrição dele', () => {
        expect(advanceTitle({ description: 'Combustível rota Zona Sul' })).toBe('Combustível rota Zona Sul');
    });
});

describe('advanceDueText', () => {
    it('vencimento como dia-calendário (o painel grava meia-noite UTC)', () => {
        expect(advanceDueText({ dueDate: '2026-09-30T00:00:00.000Z' })).toBe('Vence em 30/09/2026');
    });

    it('sem vencimento', () => {
        expect(advanceDueText({ dueDate: undefined })).toBeNull();
    });
});
