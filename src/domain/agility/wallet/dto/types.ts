// src/domain/agility/wallet/dto/types.ts

export enum TransactionType {
    CREDIT = 'CREDIT',
    DEBIT = 'DEBIT',
    REFUND = 'REFUND',
    ADJUSTMENT = 'ADJUSTMENT',
    ADVANCE = 'ADVANCE',
    ADVANCE_RETURN = 'ADVANCE_RETURN',
    COMMISSION = 'COMMISSION',
    BONUS = 'BONUS',

    // Novos tipos para diferenciação de ganhos
    UBERIZATION = 'UBERIZATION',       // Ganhos de uberização (serviços próprios)
}

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

export enum AdvanceReturnMethod {
    CASH = 'CASH',
    BANK_DEPOSIT = 'BANK_DEPOSIT',
    DEDUCTION = 'DEDUCTION',
    CARD_DEBIT = 'CARD_DEBIT',
    CARD_CREDIT = 'CARD_CREDIT',
    OTHER = 'OTHER',
}
