import { PaymentMethodType } from '@/domain/agility/service/dto/types';

import { cashDebtWarningText, showsCashDebtWarning } from '../cashDebtWarning';

describe('showsCashDebtWarning (spec 4.3)', () => {
    it('dinheiro vivo: aviso para qualquer motorista (a função nem recebe o tipo dele)', () => {
        expect(showsCashDebtWarning(PaymentMethodType.CASH)).toBe(true);
    });

    it('PIX, cartão ou nada escolhido: sem aviso', () => {
        expect(showsCashDebtWarning(PaymentMethodType.PIX)).toBe(false);
        expect(showsCashDebtWarning(PaymentMethodType.CARD_DEBIT)).toBe(false);
        expect(showsCashDebtWarning(PaymentMethodType.CARD_CREDIT)).toBe(false);
        expect(showsCashDebtWarning(null)).toBe(false);
    });
});

describe('cashDebtWarningText', () => {
    const DESTINO = 'Vai aparecer em "A devolver à empresa" na sua carteira até você devolver.';

    it('sem o prazo (resumo não carregou, back antigo): o texto não promete número', () => {
        expect(cashDebtWarningText(null)).toBe(
            'Esse valor é da empresa. Vai aparecer em "A devolver à empresa" na sua carteira, com prazo de devolução, até você devolver.',
        );
    });

    it('N dias', () => {
        expect(cashDebtWarningText(7)).toBe(`Esse valor é da empresa. Devolva em até 7 dias. ${DESTINO}`);
    });

    it('1 dia, no singular', () => {
        expect(cashDebtWarningText(1)).toBe(`Esse valor é da empresa. Devolva em até 1 dia. ${DESTINO}`);
    });

    it('0: vence na hora', () => {
        expect(cashDebtWarningText(0)).toBe(`Esse valor é da empresa e deve ser devolvido hoje. ${DESTINO}`);
    });
});
