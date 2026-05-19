// src/domain/agility/wallet/walletAPI.ts
import { apiAgility } from '@/api/apiConfig'

import {
    WalletResponse,
    PaginatedTransactionsResponse,
    WithdrawalResponse,
    AdvanceResponse,
    WalletSummaryResponse,
    UpdateBankInfoRequest,
    CreateWithdrawalRequest,
    ListTransactionsRequest,
} from './dto';

const BASE_URL = '/wallet';

/**
 * Backend envelopa toda resposta em { success, message, result, error } via
 * ResponseInterceptor global. Esse helper extrai .result (ou cai em response.data
 * se algum endpoint legado retornar sem envelope).
 */
function unwrap<T>(body: any): T {
    if (body && typeof body === 'object' && 'result' in body) {
        return body.result as T;
    }
    return body as T;
}

export const walletAPI = {
    // Wallet
    async getMyWallet(): Promise<WalletResponse> {
        const response = await apiAgility.get(BASE_URL);
        return unwrap<WalletResponse>(response.data);
    },

    async getSummary(): Promise<WalletSummaryResponse> {
        const response = await apiAgility.get(`${BASE_URL}/summary`);
        return unwrap<WalletSummaryResponse>(response.data);
    },

    async updateBankInfo(data: UpdateBankInfoRequest): Promise<WalletResponse> {
        const response = await apiAgility.patch(`${BASE_URL}/bank-info`, data);
        return unwrap<WalletResponse>(response.data);
    },

    // Transactions
    async getTransactions(params?: ListTransactionsRequest): Promise<PaginatedTransactionsResponse> {
        const response = await apiAgility.get(`${BASE_URL}/transactions`, { params });
        return unwrap<PaginatedTransactionsResponse>(response.data);
    },

    // Withdrawals
    async requestWithdrawal(data: CreateWithdrawalRequest): Promise<WithdrawalResponse> {
        const response = await apiAgility.post(`${BASE_URL}/withdrawal`, data);
        return unwrap<WithdrawalResponse>(response.data);
    },

    async getWithdrawals(page: number = 1, limit: number = 20): Promise<{ data: WithdrawalResponse[]; meta: any }> {
        const response = await apiAgility.get(`${BASE_URL}/withdrawals`, {
            params: { page, limit },
        });
        return unwrap<{ data: WithdrawalResponse[]; meta: any }>(response.data);
    },

    // Advances
    async getAdvances(page: number = 1, limit: number = 20): Promise<{ data: AdvanceResponse[]; meta: any }> {
        const response = await apiAgility.get(`${BASE_URL}/advances`, {
            params: { page, limit },
        });
        return unwrap<{ data: AdvanceResponse[]; meta: any }>(response.data);
    },

    async getAdvancesSummary(): Promise<{ totalPending: number; count: number; overdueCount: number }> {
        const response = await apiAgility.get(`${BASE_URL}/advances/summary`);
        return unwrap<{ totalPending: number; count: number; overdueCount: number }>(response.data);
    },
};
