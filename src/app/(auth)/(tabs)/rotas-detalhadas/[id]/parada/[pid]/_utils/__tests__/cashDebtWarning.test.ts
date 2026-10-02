import { PaymentMethodType } from '@/domain/agility/service/dto/types';

import { showsCashDebtWarning } from '../cashDebtWarning';

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
