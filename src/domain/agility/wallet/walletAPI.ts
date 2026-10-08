// src/domain/agility/wallet/walletAPI.ts
import { apiAgility } from '@/api/apiConfig'
import type { PagedResponse } from '@/domain/hooks/pagination';

import {
    WalletResponse,
    PaginatedTransactionsResponse,
    WithdrawalResponse,
    AdvanceResponse,
    UpdateBankInfoRequest,
    CreateWithdrawalRequest,
    ListTransactionsRequest,
    WalletSummaryResponse,
    ListDriverFreightSharesRequest,
    DriverFreightShareResponse,
} from './dto';
import { AdvanceStatus } from './dto/types';

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

    async getWithdrawals(page: number = 1, limit: number = 20): Promise<PagedResponse<WithdrawalResponse>> {
        const response = await apiAgility.get(`${BASE_URL}/withdrawals`, {
            params: { page, limit },
        });
        return unwrap<PagedResponse<WithdrawalResponse>>(response.data);
    },

    // Advances
    /** `status` (F6): um ou mais, enviados com vírgula (`PENDING,PARTIAL`). Sem ele, todos. */
    async getAdvances(page: number = 1, limit: number = 20, status?: AdvanceStatus[]): Promise<PagedResponse<AdvanceResponse>> {
        const response = await apiAgility.get(`${BASE_URL}/advances`, {
            params: { page, limit, ...(status?.length ? { status: status.join(',') } : {}) },
        });
        return unwrap<PagedResponse<AdvanceResponse>>(response.data);
    },

    async getAdvancesSummary(): Promise<{ totalPending: number; count: number; overdueCount: number }> {
        const response = await apiAgility.get(`${BASE_URL}/advances/summary`);
        return unwrap<{ totalPending: number; count: number; overdueCount: number }>(response.data);
    },

    /** Parcelas do próprio motorista (F6). O back recorta pelo token: rota de outro = lista vazia. */
    async getFreightShares(params: ListDriverFreightSharesRequest): Promise<PagedResponse<DriverFreightShareResponse>> {
        const response = await apiAgility.get(`${BASE_URL}/freight-shares`, {
            params: {
                ...(params.routingId && { routingId: params.routingId }),
                ...(params.status && { status: params.status }),
                page: params.page ?? 1,
                limit: params.limit ?? 20,
            },
        });
        return unwrap<PagedResponse<DriverFreightShareResponse>>(response.data);
    },

    /** Resumo (F3): política de saque com dívida e o teto que ela deixa (`withdrawableBalance`). */
    async getSummary(): Promise<WalletSummaryResponse> {
        const response = await apiAgility.get(`${BASE_URL}/summary`);
        return unwrap<WalletSummaryResponse>(response.data);
    },
};
