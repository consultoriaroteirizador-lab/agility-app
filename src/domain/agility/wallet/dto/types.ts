// src/domain/agility/wallet/dto/types.ts

/**
 * Tipo do lançamento. No back é TEXTO desde a F2 (`back/src/wallet/entities/types.ts`).
 * O SINAL nunca vem do tipo: vem de `TransactionResponse.direction`.
 */
export enum TransactionType {
    // Gravados desde a F2 (livro-razão).
    FREIGHT = 'FREIGHT',
    FREIGHT_RELEASE = 'FREIGHT_RELEASE',
    WITHDRAWAL_HOLD = 'WITHDRAWAL_HOLD',
    WITHDRAWAL_HOLD_RELEASE = 'WITHDRAWAL_HOLD_RELEASE',
    WITHDRAWAL = 'WITHDRAWAL',
    MANUAL_CREDIT = 'MANUAL_CREDIT',
    MANUAL_DEBIT = 'MANUAL_DEBIT',

    // Legados: continuam legíveis no extrato, nenhum caminho novo grava.
    CREDIT = 'CREDIT',
    DEBIT = 'DEBIT',
    REFUND = 'REFUND',
    ADJUSTMENT = 'ADJUSTMENT',
    ADVANCE = 'ADVANCE',
    ADVANCE_RETURN = 'ADVANCE_RETURN',
    COMMISSION = 'COMMISSION',
    BONUS = 'BONUS',
}

/** Sentido do dinheiro. `amount` é sempre positivo. */
export type LedgerDirection = 'IN' | 'OUT';

/** Origem do lançamento (`back/src/wallet/entities/types.ts:49-74`). */
export const LedgerSourceType = {
    FREIGHT_SHARE: 'FREIGHT_SHARE',
    FREIGHT_SHARE_COMPLEMENT: 'FREIGHT_SHARE_COMPLEMENT',
    FREIGHT_SHARE_RELEASE: 'FREIGHT_SHARE_RELEASE',
    FREIGHT_SHARE_REVERSAL: 'FREIGHT_SHARE_REVERSAL',
    // Redistribuição entre as parcelas da mesma rota (F3). `sourceId` = `<chave>_<parcela>`.
    FREIGHT_SHARE_REDISTRIBUTION_IN: 'FREIGHT_SHARE_REDISTRIBUTION_IN',
    FREIGHT_SHARE_REDISTRIBUTION_RELEASE: 'FREIGHT_SHARE_REDISTRIBUTION_RELEASE',
    FREIGHT_SHARE_REDISTRIBUTION_REVERSAL: 'FREIGHT_SHARE_REDISTRIBUTION_REVERSAL',
    WITHDRAWAL_HOLD: 'WITHDRAWAL_HOLD',
    WITHDRAWAL_HOLD_RELEASE: 'WITHDRAWAL_HOLD_RELEASE',
    WITHDRAWAL: 'WITHDRAWAL',
    MANUAL: 'MANUAL',
    LEGACY_RECEIVABLE_RELEASE: 'LEGACY_RECEIVABLE_RELEASE',
    LEGACY_ROUTING: 'LEGACY_ROUTING',
    LEGACY_PAYMENT: 'LEGACY_PAYMENT',
    LEGACY: 'LEGACY',
} as const;
export type LedgerSourceType = (typeof LedgerSourceType)[keyof typeof LedgerSourceType];

export enum TransactionStatus {
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
    FAILED = 'FAILED',
}

export enum WithdrawalStatus {
    PENDING = 'PENDING',
    PROCESSING = 'PROCESSING',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
    FAILED = 'FAILED',
}

export enum WithdrawalMethod {
    PIX = 'PIX',
    TED = 'TED',
    MANUAL = 'MANUAL',
}

export enum PixKeyType {
    CPF = 'CPF',
    CNPJ = 'CNPJ',
    EMAIL = 'EMAIL',
    PHONE = 'PHONE',
    RANDOM = 'RANDOM',
}

export enum AdvanceStatus {
    PENDING = 'PENDING',
    PARTIAL = 'PARTIAL',
    RETURNED = 'RETURNED',
    CANCELLED = 'CANCELLED',
}

/** Política de saque com dívida da empresa (`Company.params.finance`, F3). Padrão `FREE`. */
export type WithdrawalWithDebtPolicy = 'FREE' | 'BLOCK_IF_OVERDUE' | 'EXCESS_ONLY';

/** Origem da dívida (`DriverAdvanceEntity.origin()`, F3): com `paymentId` é cobrança em dinheiro. */
export type AdvanceOrigin = 'CASH_COLLECTION' | 'ADVANCE';
