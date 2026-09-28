import { formatCurrency } from '@/utils/formatCurrency';

import { categoryOf, describeTransaction, filterTransactions } from '../transactionDisplay';

type Tx = Parameters<typeof describeTransaction>[0];

function tx(over: Partial<Tx> = {}): Tx {
    return {
        type: 'WITHDRAWAL',
        direction: 'OUT',
        affectsBalance: true,
        status: 'COMPLETED',
        amount: 5000,
        sourceType: 'WITHDRAWAL',
        ...over,
    } as Tx;
}

describe('describeTransaction — sinal pela direção', () => {
    it('IN que mexe no saldo sai com "+" em verde', () => {
        const d = describeTransaction(tx({ type: 'FREIGHT' as Tx['type'], direction: 'IN', sourceType: 'FREIGHT_SHARE' }));
        expect(d.amountText).toBe(`+${formatCurrency(5000)}`);
        expect(d.amountColor).toBe('colorTextSuccess');
    });

    it('OUT que mexe no saldo sai com "-" em vermelho', () => {
        const d = describeTransaction(tx());
        expect(d.amountText).toBe(`-${formatCurrency(5000)}`);
        expect(d.amountColor).toBe('colorTextError');
    });

    it('crédito manual do operador sai com "+" (Bug 4: era "-" pelo tipo)', () => {
        const d = describeTransaction(tx({ type: 'MANUAL_CREDIT' as Tx['type'], direction: 'IN', sourceType: 'MANUAL' }));
        expect(d.amountText).toBe(`+${formatCurrency(5000)}`);
        expect(d.label).toBe('Crédito da empresa');
    });

    it('ADJUSTMENT legado segue a direção gravada pela migration', () => {
        expect(describeTransaction(tx({ type: 'ADJUSTMENT' as Tx['type'], direction: 'IN', sourceType: 'LEGACY' })).amountText).toBe(
            `+${formatCurrency(5000)}`,
        );
        expect(describeTransaction(tx({ type: 'ADJUSTMENT' as Tx['type'], direction: 'OUT', sourceType: 'LEGACY' })).amountText).toBe(
            `-${formatCurrency(5000)}`,
        );
    });
});

describe('describeTransaction — movimento entre baldes (affectsBalance false)', () => {
    it('frete liberado não tem sinal e diz de onde para onde foi', () => {
        const d = describeTransaction(
            tx({ type: 'FREIGHT_RELEASE' as Tx['type'], direction: 'IN', affectsBalance: false, sourceType: 'FREIGHT_SHARE_RELEASE' }),
        );
        expect(d.amountText).toBe(formatCurrency(5000));
        expect(d.amountColor).toBe('colorTextSecondary');
        expect(d.movement).toBe('Frete a liberar → Disponível');
    });

    it('bloqueio do saque não tem sinal: só o WITHDRAWAL pago tira do total', () => {
        const bloqueio = describeTransaction(
            tx({ type: 'WITHDRAWAL_HOLD' as Tx['type'], direction: 'OUT', affectsBalance: false, sourceType: 'WITHDRAWAL_HOLD' }),
        );
        const pago = describeTransaction(tx());
        expect(bloqueio.amountText).toBe(formatCurrency(5000));
        expect(bloqueio.movement).toBe('Disponível → Saque pendente');
        expect(pago.amountText).toBe(`-${formatCurrency(5000)}`);
    });

    it('saque devolvido (recusa) também é só movimento', () => {
        const d = describeTransaction(
            tx({ type: 'WITHDRAWAL_HOLD_RELEASE' as Tx['type'], direction: 'IN', affectsBalance: false, sourceType: 'WITHDRAWAL_HOLD_RELEASE' }),
        );
        expect(d.amountText).toBe(formatCurrency(5000));
        expect(d.movement).toBe('Saque pendente → Disponível');
    });
});

describe('describeTransaction — status', () => {
    it('PENDING ganha selo e cor de aviso', () => {
        const d = describeTransaction(tx({ type: 'CREDIT' as Tx['type'], direction: 'IN', status: 'PENDING' as Tx['status'], sourceType: 'LEGACY' }));
        expect(d.badge?.label).toBe('Pendente');
        expect(d.amountColor).toBe('colorTextWarning');
    });

    it('CANCELLED e FAILED ficam cinza com selo', () => {
        expect(describeTransaction(tx({ status: 'CANCELLED' as Tx['status'] })).badge?.label).toBe('Cancelado');
        expect(describeTransaction(tx({ status: 'CANCELLED' as Tx['status'] })).amountColor).toBe('colorTextSecondary');
        expect(describeTransaction(tx({ status: 'FAILED' as Tx['status'] })).badge?.label).toBe('Falhou');
    });

    it('COMPLETED não tem selo', () => {
        expect(describeTransaction(tx()).badge).toBeNull();
    });
});

describe('describeTransaction — rótulo', () => {
    it('estorno de frete (MANUAL_DEBIT de origem FREIGHT_SHARE_REVERSAL) é frete, não débito da empresa', () => {
        const d = describeTransaction(tx({ type: 'MANUAL_DEBIT' as Tx['type'], sourceType: 'FREIGHT_SHARE_REVERSAL' }));
        expect(d.label).toBe('Estorno de frete');
        expect(d.category).toBe('freight');
    });

    it('tipo desconhecido não quebra: vira "Movimentação"', () => {
        expect(describeTransaction(tx({ type: 'XYZ' as Tx['type'] })).label).toBe('Movimentação');
    });
});

describe('filterTransactions', () => {
    const lista = [
        { id: '1', ...tx({ type: 'FREIGHT' as Tx['type'], direction: 'IN', sourceType: 'FREIGHT_SHARE' }) },
        { id: '2', ...tx({ type: 'FREIGHT_RELEASE' as Tx['type'], direction: 'IN', affectsBalance: false, sourceType: 'FREIGHT_SHARE_RELEASE' }) },
        { id: '3', ...tx({ type: 'MANUAL_DEBIT' as Tx['type'], sourceType: 'FREIGHT_SHARE_REVERSAL' }) },
        { id: '4', ...tx() },
        { id: '5', ...tx({ type: 'MANUAL_CREDIT' as Tx['type'], direction: 'IN', sourceType: 'MANUAL' }) },
    ];

    it('"Fretes" junta frete, liberação e estorno de frete', () => {
        expect(filterTransactions(lista, 'freight').map((t) => t.id)).toEqual(['1', '2', '3']);
    });

    it('"Todos" devolve a lista inteira', () => {
        expect(filterTransactions(lista, 'all')).toHaveLength(5);
    });

    it('categoria de saque e de ajuste', () => {
        expect(categoryOf(tx())).toBe('withdrawals');
        expect(categoryOf(tx({ type: 'MANUAL_CREDIT' as Tx['type'], direction: 'IN', sourceType: 'MANUAL' }))).toBe('adjustments');
    });
});
