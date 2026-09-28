import type { WithdrawalResponse } from '@/domain/agility/wallet/dto/response/wallet.response';
import { WithdrawalMethod, WithdrawalStatus } from '@/domain/agility/wallet/dto/types';
import type { StatusColorConfig } from '@/theme';

const STATUS: Record<WithdrawalStatus, StatusColorConfig> = {
    [WithdrawalStatus.PENDING]: { label: 'Aguardando pagamento', textColor: 'yellow100', bgColor: 'yellow20' },
    [WithdrawalStatus.PROCESSING]: { label: 'Em processamento', textColor: 'blue500', bgColor: 'primary20' },
    [WithdrawalStatus.COMPLETED]: { label: 'Pago', textColor: 'tertiary100', bgColor: 'tertiary20' },
    // O back grava a recusa do operador como CANCELLED (withdrawal.service.ts:312).
    [WithdrawalStatus.CANCELLED]: { label: 'Recusado', textColor: 'colorTextError', bgColor: 'gray50' },
    [WithdrawalStatus.FAILED]: { label: 'Falhou', textColor: 'colorTextError', bgColor: 'gray50' },
};

type W = Pick<WithdrawalResponse, 'status' | 'method' | 'pixKey' | 'bankName' | 'bankAgency' | 'bankAccount' | 'rejectionReason' | 'lastError'>;

export interface WithdrawalDisplay {
    status: StatusColorConfig;
    /** Para onde o dinheiro foi (snapshot gravado no pedido, não os dados de hoje). */
    destination: string;
    note: string | null;
}

function destinationOf(w: W): string {
    if (w.method === WithdrawalMethod.PIX) return `PIX: ${w.pixKey ?? '—'}`;
    if (w.method === WithdrawalMethod.TED) {
        const parts = [w.bankName, w.bankAgency && `Ag. ${w.bankAgency}`, w.bankAccount && `Conta ${w.bankAccount}`].filter(Boolean);
        return `TED: ${parts.join(' · ')}`;
    }
    return 'Pagamento manual';
}

/**
 * R9: o motivo da recusa aparece inteiro (o operador escreve para o motorista); a falha
 * técnica (`lastError`) NÃO aparece crua, porque é texto de sistema.
 */
function noteOf(w: W): string | null {
    if (w.status === WithdrawalStatus.CANCELLED) {
        const reason = w.rejectionReason?.trim();
        return reason ? `Motivo da recusa: ${reason}` : 'Recusado pela empresa. O valor voltou para o disponível.';
    }
    if (w.status === WithdrawalStatus.FAILED) return 'O pagamento falhou. Fale com a empresa.';
    if ((w.status === WithdrawalStatus.PENDING || w.status === WithdrawalStatus.PROCESSING) && w.lastError) {
        return 'O pagamento falhou uma vez e voltou para a fila da empresa.';
    }
    return null;
}

export function describeWithdrawal(w: W): WithdrawalDisplay {
    return {
        status: STATUS[w.status] ?? STATUS[WithdrawalStatus.PENDING],
        destination: destinationOf(w),
        note: noteOf(w),
    };
}
