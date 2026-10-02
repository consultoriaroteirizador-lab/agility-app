import { describeWithdrawal, walletDestination } from '../withdrawalDisplay';

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

describe('chave trocada depois do pedido (F3, R1)', () => {
    const AVISO =
        'Sua chave PIX mudou depois deste pedido. O pagamento vai para o destino acima, gravado no pedido. Se não foi você quem trocou a chave, fale com a central.';

    it('saque aguardando com a chave trocada depois: aviso', () => {
        expect(describeWithdrawal(saque({ pixKeyChangedAfterRequest: true } as Partial<W>)).pixNote).toBe(AVISO);
        expect(describeWithdrawal(saque({ status: 'PROCESSING' as W['status'], pixKeyChangedAfterRequest: true } as Partial<W>)).pixNote).toBe(AVISO);
    });

    it('saque já pago, recusado ou sem troca: sem aviso', () => {
        expect(describeWithdrawal(saque({ status: 'COMPLETED' as W['status'], pixKeyChangedAfterRequest: true } as Partial<W>)).pixNote).toBeNull();
        expect(describeWithdrawal(saque({ status: 'CANCELLED' as W['status'], pixKeyChangedAfterRequest: true } as Partial<W>)).pixNote).toBeNull();
        expect(describeWithdrawal(saque({ pixKeyChangedAfterRequest: false } as Partial<W>)).pixNote).toBeNull();
        expect(describeWithdrawal(saque()).pixNote).toBeNull();
    });
});

describe('walletDestination', () => {
    it('com chave PIX: o back paga por PIX', () => {
        expect(walletDestination({ pixKey: 'nova@exemplo.com', bankName: 'Banco X', bankAgency: '1', bankAccount: '2' })).toBe('PIX: nova@exemplo.com');
    });

    it('sem chave: TED com a conta', () => {
        expect(walletDestination({ pixKey: null, bankName: 'Banco X', bankAgency: '0001', bankAccount: '12345-6' })).toBe(
            'TED: Banco X · Ag. 0001 · Conta 12345-6',
        );
    });
});
