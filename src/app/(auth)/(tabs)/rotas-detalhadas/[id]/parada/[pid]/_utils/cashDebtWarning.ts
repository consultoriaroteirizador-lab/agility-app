import { PaymentMethodType } from '@/domain/agility/service/dto/types';

/**
 * Dinheiro vivo recebido do cliente é da empresa e vira dívida para QUALQUER motorista —
 * funcionário ou terceirizado (spec financeiro 4.3; F1 tirou o crédito do terceirizado).
 * PIX e cartão caem na conta da empresa e não mexem na carteira.
 */
export function showsCashDebtWarning(paymentMethod: PaymentMethodType | null | undefined): boolean {
    return paymentMethod === PaymentMethodType.CASH;
}

const DESTINO = 'Vai aparecer em "A devolver à empresa" na sua carteira até você devolver.';

/**
 * Aviso da conclusão com dinheiro vivo. `days` = `cashReturnDueDays` do resumo da carteira (F6):
 * o back vence a dívida em agora + N×24h. Sem o número, o texto não promete prazo (R5 da F5c).
 */
export function cashDebtWarningText(days: number | null): string {
    if (days === null) {
        return 'Esse valor é da empresa. Vai aparecer em "A devolver à empresa" na sua carteira, com prazo de devolução, até você devolver.';
    }
    if (days === 0) return `Esse valor é da empresa e deve ser devolvido hoje. ${DESTINO}`;
    return `Esse valor é da empresa. Devolva em até ${days} ${days === 1 ? 'dia' : 'dias'}. ${DESTINO}`;
}
