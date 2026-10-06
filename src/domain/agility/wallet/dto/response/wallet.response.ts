// src/domain/agility/wallet/dto/response/wallet.response.ts

import {
    AdvanceOrigin,
    AdvanceStatus,
    LedgerDirection,
    PixKeyType,
    TransactionStatus,
    TransactionType,
    WithdrawalMethod,
    WithdrawalStatus,
    WithdrawalWithDebtPolicy,
} from '../types';

export interface WalletResponse {
    id: string;
    driverId: string;
    /** Total, em centavos: disponível + frete a liberar + saque pendente. */
    balance: number;
    /** Frete bloqueado, esperando o operador liberar (F2). */
    freightPendingBalance: number;
    /** Valor de saques pedidos e ainda não pagos (F2). */
    withdrawalPendingBalance: number;
    /** = freightPendingBalance + withdrawalPendingBalance. */
    blockedBalance: number;
    /** = balance − blockedBalance. Teto do saque. */
    availableBalance: number;
    /** pixKey || (bankName && bankAgency && bankAccount), calculado no back. */
    hasBankInfo: boolean;
    bankName?: string | null;
    bankAgency?: string | null;
    bankAccount?: string | null;
    pixKey?: string | null;
    pixKeyType?: PixKeyType | null;
    /** Última troca de banco, conta ou chave (F3). */
    bankInfoChangedAt?: string | null;
    /** Última troca da chave PIX, ISO (F3). Conta o primeiro cadastro, a remoção e a troca de tipo. */
    pixKeyChangedAt?: string | null;
    /** Chave anterior à última troca, já mascarada pelo back (4 últimos). `null` = não havia chave. */
    previousPixKeyMasked?: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface TransactionResponse {
    id: string;
    walletId: string;
    /** Tipo desconhecido (o back é texto) cai em "Movimentação" no extrato. */
    type: TransactionType;
    /** Sinal do lançamento. Única fonte de "+"/"−". */
    direction: LedgerDirection;
    /** `false` = move entre baldes (frete liberado, saque bloqueado/devolvido); o total não muda. */
    affectsBalance: boolean;
    status: TransactionStatus;
    /** Centavos, sempre > 0. */
    amount: number;
    balanceAfter: number;
    description: string;
    /** Origem (`LedgerSourceType`). O back devolve texto. */
    sourceType: string;
    /** Na linha de frete, o id da parcela. Nunca exibir. */
    sourceId: string;
    /**
     * Metadata do gesto que originou o lançamento (`wallet-transaction.entity.ts`, back).
     * Tipado minimamente: hoje só `action` é lido no app (FREIGHT_RELEASE com
     * `action === 'CANCEL'` é o cancelamento da parcela, não a liberação normal —
     * ver `transactionDisplay.ts`). O resto do objeto varia por gesto/origem.
     */
    metadata?: { action?: string; [key: string]: unknown } | null;
    /** Derivados de `direction` no back. Não use para sinal. */
    isCredit: boolean;
    isDebit: boolean;
    routingId?: string | null;
    serviceId?: string | null;
    paymentId?: string | null;
    withdrawalId?: string | null;
    /**
     * Comprovante do gesto do escritorio, ja com URL ASSINADA pelo backend (a
     * chave crua do storage nao abre). Na transacao de saque, o backend resolve
     * a partir do saque ligado por `withdrawalId`. Vazio = sem comprovante.
     */
    proofUrls?: string[];
    advanceId?: string | null;
    createdAt: string;
    updatedAt?: string;
}

export interface PaginatedTransactionsResponse {
    data: TransactionResponse[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface WithdrawalResponse {
    id: string;
    walletId: string;
    driverId?: string | null;
    driverName?: string | null;
    /** Última troca da chave da carteira (F3). */
    walletPixKeyChangedAt?: string | null;
    /** A chave da carteira mudou DEPOIS deste pedido; o pagamento vai para o destino gravado aqui (F3). */
    pixKeyChangedAfterRequest?: boolean;
    amount: number;
    fee: number;
    netAmount: number;
    method: WithdrawalMethod;
    /** CANCELLED = recusado pelo operador (com `rejectionReason`). */
    status: WithdrawalStatus;
    bankName?: string | null;
    bankAgency?: string | null;
    bankAccount?: string | null;
    pixKey?: string | null;
    pixKeyType?: PixKeyType | null;
    processedAt?: string;
    processedBy?: string | null;
    transactionId?: string | null;
    externalRef?: string | null;
    notes?: string | null;
    rejectionReason?: string | null;
    /** Falha técnica do pagamento; o saque volta a PENDING (UC12). Texto do operador, não exibir cru. */
    lastError?: string | null;
    lastErrorAt?: string;
    /** URLs já assinadas. */
    proofUrls?: string[];
    createdAt: string;
    updatedAt?: string;
}

export interface AdvanceResponse {
    id: string;
    driverId: string;
    amount: number;
    returnedAmount: number;
    pendingAmount: number;
    status: AdvanceStatus;
    description: string;
    routingId?: string;
    serviceId?: string;
    dueDate?: string;
    returnedAt?: string;
    isOverdue: boolean;
    notes?: string;
    /** Pagamento em dinheiro que gerou a dívida (F3). Nunca exibir. */
    paymentId?: string | null;
    /** `CASH_COLLECTION` = dinheiro recebido de cliente; `ADVANCE` = adiantamento. */
    origin?: AdvanceOrigin;
    cancelledAt?: string | null;
    /** Motivo do cancelamento, escrito pela empresa (UC15). `cancelledBy` é id: não é tipado de propósito. */
    cancelReason?: string | null;
    createdAt: string;
}

/** `GET /wallet/summary` (back `WalletService.getSummary`, F3). Só os campos que o app lê. */
export interface WalletSummaryResponse {
    availableBalance: number;
    /** Dívida aberta (PENDING/PARTIAL), em centavos. */
    pendingAdvances: number;
    withdrawalWithDebtPolicy: WithdrawalWithDebtPolicy;
    /** Quanto a política deixa sacar agora, em centavos (a mesma conta do pedido de saque). */
    withdrawableBalance: number;
    /**
     * Prazo de devolução do dinheiro vivo, em dias (F6): inteiro em [0, 365], padrão 7 no back.
     * Ausente = back sem a F6. O vencimento é agora + N×24h (0 = vence na hora).
     */
    cashReturnDueDays?: number;
}
