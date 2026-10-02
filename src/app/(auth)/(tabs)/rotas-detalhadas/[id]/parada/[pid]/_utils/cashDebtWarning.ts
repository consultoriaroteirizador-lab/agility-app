import { PaymentMethodType } from '@/domain/agility/service/dto/types';

/**
 * Dinheiro vivo recebido do cliente é da empresa e vira dívida para QUALQUER motorista —
 * funcionário ou terceirizado (spec financeiro 4.3; F1 tirou o crédito do terceirizado).
 * PIX e cartão caem na conta da empresa e não mexem na carteira.
 */
export function showsCashDebtWarning(paymentMethod: PaymentMethodType | null | undefined): boolean {
    return paymentMethod === PaymentMethodType.CASH;
}

/** O prazo em dias (`cashReturnDueDays`) não chega ao app: o texto não promete número (R7). */
export const CASH_DEBT_WARNING_TEXT =
    'Esse valor é da empresa. Vai aparecer em "A devolver à empresa" na sua carteira, com prazo de devolução, até você devolver.';
