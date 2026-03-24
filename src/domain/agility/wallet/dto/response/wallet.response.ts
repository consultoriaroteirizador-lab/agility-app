// src/domain/agility/wallet/dto/response/wallet.response.ts

import { TransactionType, TransactionStatus, WithdrawalStatus, WithdrawalMethod, PixKeyType, AdvanceStatus } from '../types';

export interface WalletResponse {
    id: string;
    driverId: string;
    balance: number;
    blockedBalance: number;
    availableBalance: number;
    hasBankInfo: boolean;
    bankName?: string;
    bankAgency?: string;
    bankAccount?: string;
    pixKey?: string;
    pixKeyType?: PixKeyType;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface TransactionResponse {
    id: string;
    walletId: string;
    type: TransactionType;
    status: TransactionStatus;
    amount: number;
    balanceAfter: number;
    description: string;
    isCredit: boolean;
    isDebit: boolean;
    routingId?: string;
    serviceId?: string;
    paymentId?: string;
    withdrawalId?: string;
    advanceId?: string;
    createdAt: string;
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
    amount: number;
    fee: number;
    netAmount: number;
    method: WithdrawalMethod;
    status: WithdrawalStatus;
    bankName?: string;
    bankAgency?: string;
    bankAccount?: string;
    pixKey?: string;
    pixKeyType?: PixKeyType;
    processedAt?: string;
    processedBy?: string;
    transactionId?: string;
    externalRef?: string;
    notes?: string;
    rejectionReason?: string;
    createdAt: string;
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
    createdAt: string;
}

export interface WalletSummaryResponse {
    balance: number;
    blockedBalance: number;
    availableBalance: number;
    totalReceived: number;
    totalWithdrawn: number;
    pendingWithdrawals: number;
    pendingAdvances: number;
    transactionCount: number;
}
