// src/domain/agility/wallet/useCase/useInfiniteWalletLists.ts
import { useInfinitePagedList } from '@/domain/hooks/useInfinitePagedList';
import { KEY_WALLET } from '@/domain/queryKeys';
import { useAuthCredentialsService } from '@/services';

import type { AdvanceResponse, ListTransactionsRequest, TransactionResponse, WithdrawalResponse } from '../dto';
import { walletAPI } from '../walletAPI';

export const TRANSACTIONS_PAGE_SIZE = 20;
const WITHDRAWALS_PAGE_SIZE = 20;
const ADVANCES_PAGE_SIZE = 20;

export type TransactionFilters = Omit<ListTransactionsRequest, 'page' | 'limit'>;

function useIsAuthenticated() {
    const { authCredentials } = useAuthCredentialsService();
    return !!authCredentials?.accessToken && !!authCredentials?.tenantId;
}

/** Extrato da carteira, acumulando páginas (`GET /wallet/transactions`). */
export function useInfiniteTransactions(filters: TransactionFilters = {}) {
    const enabled = useIsAuthenticated();
    return useInfinitePagedList<TransactionResponse>(
        [KEY_WALLET, 'transactions', 'infinite', filters],
        (page) => walletAPI.getTransactions({ ...filters, page, limit: TRANSACTIONS_PAGE_SIZE }),
        { enabled },
    );
}

/** Saques do motorista, mais novo primeiro (`GET /wallet/withdrawals`). */
export function useInfiniteWithdrawals() {
    const enabled = useIsAuthenticated();
    return useInfinitePagedList<WithdrawalResponse>(
        [KEY_WALLET, 'withdrawals', 'infinite'],
        (page) => walletAPI.getWithdrawals(page, WITHDRAWALS_PAGE_SIZE),
        { enabled },
    );
}

/** Adiantamentos e dívidas de cobrança, todos os status (`GET /wallet/advances`). */
export function useInfiniteAdvances() {
    const enabled = useIsAuthenticated();
    return useInfinitePagedList<AdvanceResponse>(
        [KEY_WALLET, 'advances', 'infinite'],
        (page) => walletAPI.getAdvances(page, ADVANCES_PAGE_SIZE),
        { enabled },
    );
}
