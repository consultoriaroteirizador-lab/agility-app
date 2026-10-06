import { withdrawalSubmitToast } from '../withdrawalSubmit';

describe('withdrawalSubmitToast', () => {
    it.each([['PENDING'], ['PROCESSING'], [undefined]])('%s: pedido aceito agora', (status) => {
        expect(withdrawalSubmitToast({ status })).toEqual({ message: 'Saque solicitado. Acompanhe em Meus saques.', type: 'success' });
    });

    it('sem corpo (back antigo) conta como pedido aceito', () => {
        expect(withdrawalSubmitToast(undefined).type).toBe('success');
    });

    it('repetição de um saque já pago', () => {
        expect(withdrawalSubmitToast({ status: 'COMPLETED' })).toEqual({ message: 'Este saque já foi pago.', type: 'success' });
    });

    it('repetição de um saque que a empresa recusou', () => {
        expect(withdrawalSubmitToast({ status: 'CANCELLED' })).toEqual({
            message: 'Este saque foi recusado pela empresa. Veja o motivo em Meus saques.',
            type: 'error',
        });
    });

    it('repetição de um saque com falha no pagamento', () => {
        expect(withdrawalSubmitToast({ status: 'FAILED' })).toEqual({ message: 'Este saque teve falha no pagamento. Veja em Meus saques.', type: 'error' });
    });
});
