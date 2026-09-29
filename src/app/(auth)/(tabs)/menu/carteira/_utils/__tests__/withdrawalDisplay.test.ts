import { describeWithdrawal } from '../withdrawalDisplay';

type W = Parameters<typeof describeWithdrawal>[0];

function saque(over: Partial<W> = {}): W {
    return {
        status: 'PENDING',
        method: 'PIX',
        pixKey: '12345678900',
        bankName: null,
        bankAgency: null,
        bankAccount: null,
        rejectionReason: null,
        lastError: null,
        ...over,
    } as W;
}

describe('describeWithdrawal', () => {
    it('rótulo de cada status (recusado é CANCELLED no back)', () => {
        expect(describeWithdrawal(saque()).status.label).toBe('Aguardando pagamento');
        expect(describeWithdrawal(saque({ status: 'PROCESSING' as W['status'] })).status.label).toBe('Em processamento');
        expect(describeWithdrawal(saque({ status: 'COMPLETED' as W['status'] })).status.label).toBe('Pago');
        expect(describeWithdrawal(saque({ status: 'CANCELLED' as W['status'] })).status.label).toBe('Recusado');
        expect(describeWithdrawal(saque({ status: 'FAILED' as W['status'] })).status.label).toBe('Falhou');
    });

    it('recusado mostra o motivo que o operador escreveu', () => {
        const d = describeWithdrawal(saque({ status: 'CANCELLED' as W['status'], rejectionReason: 'Chave PIX de outra pessoa' }));
        expect(d.note).toBe('Motivo da recusa: Chave PIX de outra pessoa');
    });

    it('recusado sem motivo ainda explica que o valor voltou', () => {
        expect(describeWithdrawal(saque({ status: 'CANCELLED' as W['status'] })).note).toBe('Recusado pela empresa. O valor voltou para o disponível.');
    });

    it('falha técnica que voltou para a fila NÃO mostra o texto técnico', () => {
        const d = describeWithdrawal(saque({ lastError: 'ECONNRESET at PixGateway.send' }));
        expect(d.note).toBe('O pagamento falhou uma vez e voltou para a fila da empresa.');
        expect(d.note).not.toContain('ECONNRESET');
    });

    it('pendente sem erro não tem nota', () => {
        expect(describeWithdrawal(saque()).note).toBeNull();
    });

    it('destino PIX e TED a partir do snapshot do saque', () => {
        expect(describeWithdrawal(saque()).destination).toBe('PIX: 12345678900');
        expect(
            describeWithdrawal(saque({ method: 'TED' as W['method'], pixKey: null, bankName: 'Banco X', bankAgency: '1234', bankAccount: '56789-0' }))
                .destination,
        ).toBe('TED: Banco X · Ag. 1234 · Conta 56789-0');
    });
});
