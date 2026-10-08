import { WithdrawalStatus } from '@/domain/agility/wallet/dto/types';

export interface WithdrawalSubmitToast {
    message: string;
    type: 'success' | 'error';
}

/**
 * O back devolve o saque gravado. Com a `idempotencyKey` (F6), uma repetição devolve o pedido
 * original NO ESTADO ATUAL: se a empresa já o tratou, "Saque solicitado" mentiria (R2 da F5c).
 */
export function withdrawalSubmitToast(w: { status?: WithdrawalStatus | string } | null | undefined): WithdrawalSubmitToast {
    switch (w?.status) {
        case WithdrawalStatus.COMPLETED:
            return { message: 'Este saque já foi pago.', type: 'success' };
        case WithdrawalStatus.CANCELLED:
            return { message: 'Este saque foi recusado pela empresa. Veja o motivo em Meus saques.', type: 'error' };
        case WithdrawalStatus.FAILED:
            return { message: 'Este saque teve falha no pagamento. Veja em Meus saques.', type: 'error' };
        default:
            return { message: 'Saque solicitado. Acompanhe em Meus saques.', type: 'success' };
    }
}
