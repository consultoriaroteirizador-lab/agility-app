// src/domain/agility/wallet/useCase/useGetWallet.ts

import { useQuery } from '@tanstack/react-query';

import { KEY_WALLET } from '@/domain/queryKeys';
import { useAuthCredentialsService } from '@/services';

import { walletAPI } from '../walletAPI';


export function useGetWallet() {
    const { authCredentials } = useAuthCredentialsService();
    const isAuthenticated = !!authCredentials?.accessToken && !!authCredentials?.tenantId;

    const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
        queryKey: [KEY_WALLET, 'balance'],
        queryFn: () => walletAPI.getMyWallet(),
        enabled: isAuthenticated,
        staleTime: 1000 * 60 * 2, // 2 minutes
    });

    return {
        wallet: data,
        isLoading,
        isError,
        error,
        refetch,
        isRefetching,
    };
}
