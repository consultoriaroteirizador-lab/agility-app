// src/domain/agility/wallet/dto/request/wallet.request.ts

import { PixKeyType, AdvanceReturnMethod } from '../types';

export interface UpdateBankInfoRequest {
    bankName?: string;
    bankAgency?: string;
    bankAccount?: string;
    pixKey?: string;
    pixKeyType?: PixKeyType;
}

export interface CreateWithdrawalRequest {
    amount: number;
    fee?: number;
}

export interface ListTransactionsRequest {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
}

export interface CreateAdvanceRequest {
    driverId: string;
    amount: number;
    description: string;
    routingId?: string;
    serviceId?: string;
    dueDate?: string;
    notes?: string;
}

export interface ReturnAdvanceRequest {
    amount: number;
    method: AdvanceReturnMethod;
    paymentMethod?: string;
    notes?: string;
}
