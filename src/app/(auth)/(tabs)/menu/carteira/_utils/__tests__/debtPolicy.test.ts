import { formatCurrency } from '@/utils/formatCurrency';

import { isWithdrawalKeyReused, maxWithdrawalFromError, policyNoticeColor, withdrawalErrorMessage, withdrawalPolicyNotice } from '../debtPolicy';

type Allowance = NonNullable<Parameters<typeof withdrawalPolicyNotice>[0]>;
const politica = (over: Partial<Allowance>): Allowance => ({ policy: 'FREE', withdrawableCents: 10000, openDebtCents: 0, availableCents: null, ...over });

describe('withdrawalPolicyNotice', () => {
    it('sem política carregada, ou FREE: nenhum aviso', () => {
        expect(withdrawalPolicyNotice(null, 2)).toBeNull();
        expect(withdrawalPolicyNotice(politica({ policy: 'FREE', openDebtCents: 5000 }), 2)).toBeNull();
    });

    it('BLOCK_IF_OVERDUE com vencida: bloqueio com a contagem', () => {
        expect(withdrawalPolicyNotice(politica({ policy: 'BLOCK_IF_OVERDUE', withdrawableCents: 0, openDebtCents: 5000 }), 2)).toEqual({
            tone: 'block',
            text: 'Saque bloqueado: você tem 2 dívida(s) vencida(s) com a empresa. Devolva o valor para liberar o saque.',
        });
    });

    it('BLOCK_IF_OVERDUE com dívida a vencer (contagem carregada, 0 vencidas): o aviso da regra com o prazo', () => {
        expect(withdrawalPolicyNotice(politica({ policy: 'BLOCK_IF_OVERDUE', openDebtCents: 5000, availableCents: 10000 }), 0)).toEqual({
            tone: 'info',
            text: 'Na sua empresa, dívida vencida bloqueia o saque. Devolva o dinheiro até o vencimento.',
        });
    });

    // Achado 1 da revisão final: com /wallet/advances/summary falho, o teto 0 com disponível > 0
    // na MESMA resposta da política prova o bloqueio — o aviso não pode sair como "info".
    const BLOQUEIO_SEM_CONTAGEM = {
        tone: 'block',
        text: 'Saque bloqueado: você tem dívida vencida com a empresa. Devolva o valor para liberar o saque.',
    };

    it('BLOCK_IF_OVERDUE, contagem indisponível, teto 0 com disponível > 0: bloqueio provado, sem citar o número de dívidas', () => {
        expect(withdrawalPolicyNotice(politica({ policy: 'BLOCK_IF_OVERDUE', withdrawableCents: 0, openDebtCents: 5000, availableCents: 10000 }), null)).toEqual(
            BLOQUEIO_SEM_CONTAGEM,
        );
    });

    it('BLOCK_IF_OVERDUE, contagem desatualizada (0) mas a política prova o bloqueio: vale a política', () => {
        expect(withdrawalPolicyNotice(politica({ policy: 'BLOCK_IF_OVERDUE', withdrawableCents: 0, openDebtCents: 5000, availableCents: 10000 }), 0)).toEqual(
            BLOQUEIO_SEM_CONTAGEM,
        );
    });

    it('BLOCK_IF_OVERDUE, contagem indisponível e sem prova: texto neutro, sem "até o vencimento"', () => {
        const neutro = { tone: 'info', text: 'Na sua empresa, dívida vencida bloqueia o saque.' };
        // teto = disponível: a política não está travando agora
        expect(withdrawalPolicyNotice(politica({ policy: 'BLOCK_IF_OVERDUE', withdrawableCents: 10000, openDebtCents: 5000, availableCents: 10000 }), null)).toEqual(neutro);
        // teto 0 com disponível 0: nada a sacar, não prova bloqueio
        expect(withdrawalPolicyNotice(politica({ policy: 'BLOCK_IF_OVERDUE', withdrawableCents: 0, openDebtCents: 5000, availableCents: 0 }), null)).toEqual(neutro);
        // resumo sem o disponível: não prova
        expect(withdrawalPolicyNotice(politica({ policy: 'BLOCK_IF_OVERDUE', withdrawableCents: 0, openDebtCents: 5000, availableCents: null }), null)).toEqual(neutro);
    });

    it('BLOCK_IF_OVERDUE sem dívida: nenhum aviso', () => {
        expect(withdrawalPolicyNotice(politica({ policy: 'BLOCK_IF_OVERDUE', openDebtCents: 0 }), 0)).toBeNull();
    });

    it('EXCESS_ONLY com dívida: diz o máximo', () => {
        expect(withdrawalPolicyNotice(politica({ policy: 'EXCESS_ONLY', withdrawableCents: 7000, openDebtCents: 3000 }), 0)).toEqual({
            tone: 'limit',
            text: `Com ${formatCurrency(3000)} em dívidas abertas, você pode sacar até ${formatCurrency(7000)}.`,
        });
    });

    it('EXCESS_ONLY com dívida que cobre o disponível: bloqueio sem "até R$ 0,00"', () => {
        expect(withdrawalPolicyNotice(politica({ policy: 'EXCESS_ONLY', withdrawableCents: 0, openDebtCents: 30000 }), 0)).toEqual({
            tone: 'block',
            text: `Com ${formatCurrency(30000)} em dívidas abertas, não há valor liberado para saque agora.`,
        });
    });
});

describe('policyNoticeColor', () => {
    it('block é erro; limit e info são aviso', () => {
        expect(policyNoticeColor('block')).toBe('colorTextError');
        expect(policyNoticeColor('limit')).toBe('colorTextWarning');
        expect(policyNoticeColor('info')).toBe('colorTextWarning');
    });
});

describe('withdrawalErrorMessage', () => {
    const erro = (error: Record<string, unknown>) => ({ success: false, error });

    it('WITHDRAWAL_BLOCKED_BY_OVERDUE_DEBT', () => {
        expect(withdrawalErrorMessage(erro({ code: 'WITHDRAWAL_BLOCKED_BY_OVERDUE_DEBT', message: 'x', maxAmountCents: 0 }), 'f')).toBe(
            'Saque bloqueado: você tem dívida vencida com a empresa. Devolva o valor à empresa para liberar o saque.',
        );
    });

    it('WITHDRAWAL_EXCEEDS_AMOUNT_ABOVE_DEBT com o máximo', () => {
        expect(withdrawalErrorMessage(erro({ code: 'WITHDRAWAL_EXCEEDS_AMOUNT_ABOVE_DEBT', message: 'x', maxAmountCents: 4000 }), 'f')).toBe(
            `Você tem dívidas em aberto com a empresa. O máximo que pode sacar agora é ${formatCurrency(4000)}.`,
        );
    });

    it('WITHDRAWAL_EXCEEDS_AMOUNT_ABOVE_DEBT com máximo de milhar: formata com separador de milhar', () => {
        const msg = withdrawalErrorMessage(erro({ code: 'WITHDRAWAL_EXCEEDS_AMOUNT_ABOVE_DEBT', message: 'x', maxAmountCents: 1234500 }), 'f');
        expect(msg).toBe(`Você tem dívidas em aberto com a empresa. O máximo que pode sacar agora é ${formatCurrency(1234500)}.`);
        expect(msg).toMatch(/máximo que pode sacar agora é R\$\s12\.345,00\./);
    });

    it('WITHDRAWAL_EXCEEDS_AMOUNT_ABOVE_DEBT com máximo 0', () => {
        expect(withdrawalErrorMessage(erro({ code: 'WITHDRAWAL_EXCEEDS_AMOUNT_ABOVE_DEBT', message: 'x', maxAmountCents: 0 }), 'f')).toBe(
            'Você tem dívidas em aberto com a empresa e, por enquanto, não há valor liberado para saque.',
        );
    });

    it('WITHDRAWAL_EXCEEDS_AMOUNT_ABOVE_DEBT sem o máximo (adaptador antigo): a frase do back', () => {
        expect(withdrawalErrorMessage(erro({ code: 'WITHDRAWAL_EXCEEDS_AMOUNT_ABOVE_DEBT', message: 'Com R$ 30,00 em dívidas abertas, o saque máximo é R$ 40,00.' }), 'f')).toBe(
            'Com R$ 30,00 em dívidas abertas, o saque máximo é R$ 40,00.',
        );
    });

    it('outro erro: a frase do back; sem frase: o fallback', () => {
        expect(withdrawalErrorMessage(erro({ code: 'BAD_REQUEST', message: 'Saldo disponível insuficiente' }), 'f')).toBe('Saldo disponível insuficiente');
        expect(withdrawalErrorMessage(undefined, 'Não foi possível solicitar o saque.')).toBe('Não foi possível solicitar o saque.');
    });
});

describe('maxWithdrawalFromError', () => {
    it('só devolve o máximo da recusa EXCESS_ONLY, finito e > 0 (fracionado cai para o centavo de baixo)', () => {
        expect(maxWithdrawalFromError({ error: { code: 'WITHDRAWAL_EXCEEDS_AMOUNT_ABOVE_DEBT', maxAmountCents: 4000 } })).toBe(4000);
        expect(maxWithdrawalFromError({ error: { code: 'WITHDRAWAL_EXCEEDS_AMOUNT_ABOVE_DEBT', maxAmountCents: 0 } })).toBeNull();
        expect(maxWithdrawalFromError({ error: { code: 'WITHDRAWAL_EXCEEDS_AMOUNT_ABOVE_DEBT', maxAmountCents: 40.5 } })).toBe(40);
        expect(maxWithdrawalFromError({ error: { code: 'WITHDRAWAL_EXCEEDS_AMOUNT_ABOVE_DEBT', maxAmountCents: 0.5 } })).toBeNull();
        expect(maxWithdrawalFromError({ error: { code: 'WITHDRAWAL_EXCEEDS_AMOUNT_ABOVE_DEBT', maxAmountCents: -1 } })).toBeNull();
        expect(maxWithdrawalFromError({ error: { code: 'WITHDRAWAL_EXCEEDS_AMOUNT_ABOVE_DEBT', maxAmountCents: Infinity } })).toBeNull();
        expect(maxWithdrawalFromError({ error: { code: 'WITHDRAWAL_BLOCKED_BY_OVERDUE_DEBT', maxAmountCents: 4000 } })).toBeNull();
        expect(maxWithdrawalFromError(undefined)).toBeNull();
    });
});

describe('erros da F6 no saque', () => {
    const erro = (code: string, extra: Record<string, unknown> = {}) => ({ success: false, error: { code, message: 'texto do back', ...extra } });

    it('IDEMPOTENCY_KEY_REUSED manda conferir Meus saques', () => {
        expect(withdrawalErrorMessage(erro('IDEMPOTENCY_KEY_REUSED'), 'fallback')).toBe(
            'Esta tela já enviou um pedido de saque com outro valor. Confira em Meus saques antes de pedir de novo.',
        );
        expect(isWithdrawalKeyReused(erro('IDEMPOTENCY_KEY_REUSED'))).toBe(true);
        expect(isWithdrawalKeyReused(erro('WITHDRAWAL_BLOCKED_BY_OVERDUE_DEBT'))).toBe(false);
        expect(isWithdrawalKeyReused(undefined)).toBe(false);
    });

    it('WALLET_INVARIANT_VIOLATION (409) não repete o texto do back, que é do operador', () => {
        const msg = withdrawalErrorMessage(erro('WALLET_INVARIANT_VIOLATION', { constraint: 'driver_wallets_balance_non_negative' }), 'fallback');
        expect(msg).toBe('Sua carteira está com o saldo em revisão e não aceitou o saque agora. Nada foi descontado. Fale com a central.');
        expect(msg).not.toContain('driver_wallets');
    });
});
