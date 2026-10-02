/**
 * Teto do saque pela política de dívida (F3, `GET /wallet/summary`). Back sem a F3 ou
 * resposta fora do contrato vira `null`: a tela cai no disponível e o back decide (R3).
 */
import { toWithdrawalAllowance, withdrawCapCents } from '../withdrawalAllowance';

type Resumo = Parameters<typeof toWithdrawalAllowance>[0];

describe('toWithdrawalAllowance', () => {
    it('lê a política, o teto e a dívida aberta do resumo', () => {
        const resumo = { availableBalance: 10000, pendingAdvances: 3000, withdrawalWithDebtPolicy: 'EXCESS_ONLY', withdrawableBalance: 7000 } as Resumo;
        expect(toWithdrawalAllowance(resumo)).toEqual({ policy: 'EXCESS_ONLY', withdrawableCents: 7000, openDebtCents: 3000 });
    });

    it('back sem a F3 (sem os campos novos): null', () => {
        expect(toWithdrawalAllowance({ availableBalance: 10000, pendingAdvances: 0 } as Resumo)).toBeNull();
    });

    it('política fora das três conhecidas: null', () => {
        expect(toWithdrawalAllowance({ availableBalance: 1, pendingAdvances: 0, withdrawalWithDebtPolicy: 'OUTRA', withdrawableBalance: 1 } as unknown as Resumo)).toBeNull();
    });

    it('teto negativo ou não numérico não é centavo válido: null', () => {
        expect(toWithdrawalAllowance({ availableBalance: 1, pendingAdvances: 0, withdrawalWithDebtPolicy: 'FREE', withdrawableBalance: -1 } as Resumo)).toBeNull();
        expect(toWithdrawalAllowance({ availableBalance: 1, pendingAdvances: 0, withdrawalWithDebtPolicy: 'FREE', withdrawableBalance: NaN } as Resumo)).toBeNull();
        expect(toWithdrawalAllowance({ availableBalance: 1, pendingAdvances: 0, withdrawalWithDebtPolicy: 'FREE', withdrawableBalance: '70' } as unknown as Resumo)).toBeNull();
    });

    it('teto fracionado (Decimal(12,2) do back) não descarta a política: arredonda para baixo', () => {
        const resumo = { availableBalance: 2000, pendingAdvances: 0, withdrawalWithDebtPolicy: 'EXCESS_ONLY', withdrawableBalance: 1234.5 } as Resumo;
        expect(toWithdrawalAllowance(resumo)).toEqual({ policy: 'EXCESS_ONLY', withdrawableCents: 1234, openDebtCents: 0 });
    });

    it('sem resumo: null', () => {
        expect(toWithdrawalAllowance(undefined)).toBeNull();
    });
});

describe('withdrawCapCents', () => {
    const politica = (withdrawableCents: number) => ({ policy: 'EXCESS_ONLY' as const, withdrawableCents, openDebtCents: 3000 });

    it('sem política conhecida: o disponível', () => {
        expect(withdrawCapCents(10000, null)).toBe(10000);
    });

    it('o menor entre o disponível e o que a política deixa', () => {
        expect(withdrawCapCents(10000, politica(7000))).toBe(7000);
        expect(withdrawCapCents(5000, politica(7000))).toBe(5000);
    });

    it('disponível negativo legado vira 0', () => {
        expect(withdrawCapCents(-500, null)).toBe(0);
    });

    it('teto fracionado cai para o centavo inteiro de baixo', () => {
        expect(withdrawCapCents(10000, { policy: 'FREE', withdrawableCents: 1234.5, openDebtCents: 0 })).toBe(1234);
    });
});
