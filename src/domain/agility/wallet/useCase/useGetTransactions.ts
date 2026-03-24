// src/domain/agility/wallet/useCase/useGetTransactions.ts

import { useQuery } from '@tanstack/react-query';

import { KEY_WALLET } from '@/domain/queryKeys';
import { useAuthCredentialsService } from '@/services';

import { ListTransactionsRequest } from '../dto';
import { walletAPI } from '../walletAPI';

export function useGetTransactions(params?: ListTransactionsRequest) {
    const { authCredentials } = useAuthCredentialsService();
    const isAuthenticated = !!authCredentials?.accessToken && !!authCredentials?.tenantId;

    const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
        queryKey: [KEY_WALLET, 'transactions', params],
        queryFn: () => walletAPI.getTransactions(params),
        enabled: isAuthenticated,
        staleTime: 1000 * 60 * 1, // 1 minute
    });

    return {
        transactions: data?.data ?? [],
        meta: data?.meta,
        isLoading,
        isError,
        error,
        refetch,
        isRefetching,
    };
}
