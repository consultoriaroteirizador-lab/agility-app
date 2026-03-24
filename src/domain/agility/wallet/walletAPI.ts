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

export const walletAPI = {
    // Wallet
    async getMyWallet(): Promise<WalletResponse> {
        const response = await apiAgility.get<WalletResponse>(BASE_URL);
        return response.data;
    },

    async getSummary(): Promise<WalletSummaryResponse> {
        const response = await apiAgility.get<WalletSummaryResponse>(`${BASE_URL}/summary`);
        return response.data;
    },

    async updateBankInfo(data: UpdateBankInfoRequest): Promise<WalletResponse> {
        const response = await apiAgility.patch<WalletResponse>(`${BASE_URL}/bank-info`, data);
        return response.data;
    },

    // Transactions
    async getTransactions(params?: ListTransactionsRequest): Promise<PaginatedTransactionsResponse> {
        const response = await apiAgility.get<PaginatedTransactionsResponse>(`${BASE_URL}/transactions`, {
            params,
        });
        return response.data;
    },

    // Withdrawals
    async requestWithdrawal(data: CreateWithdrawalRequest): Promise<WithdrawalResponse> {
        const response = await apiAgility.post<WithdrawalResponse>(`${BASE_URL}/withdrawal`, data);
        return response.data;
    },

    async getWithdrawals(page: number = 1, limit: number = 20): Promise<{ data: WithdrawalResponse[]; meta: any }> {
        const response = await apiAgility.get<{ data: WithdrawalResponse[]; meta: any }>(`${BASE_URL}/withdrawals`, {
            params: { page, limit },
        });
        return response.data;
    },

    // Advances
    async getAdvances(page: number = 1, limit: number = 20): Promise<{ data: AdvanceResponse[]; meta: any }> {
        const response = await apiAgility.get<{ data: AdvanceResponse[]; meta: any }>(`${BASE_URL}/advances`, {
            params: { page, limit },
        });
        return response.data;
    },

    async getAdvancesSummary(): Promise<{ totalPending: number; count: number; overdueCount: number }> {
        const response = await apiAgility.get<{ totalPending: number; count: number; overdueCount: number }>(`${BASE_URL}/advances/summary`);
        return response.data;
    },
};
