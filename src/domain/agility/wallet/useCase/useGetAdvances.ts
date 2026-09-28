// src/domain/agility/wallet/useCase/useGetAdvances.ts

import { useQuery } from '@tanstack/react-query';

import { KEY_WALLET } from '@/domain/queryKeys';
import { useAuthCredentialsService } from '@/services';

import { walletAPI } from '../walletAPI';

export function useGetAdvancesSummary() {
    const { authCredentials } = useAuthCredentialsService();
    const isAuthenticated = !!authCredentials?.accessToken && !!authCredentials?.tenantId;

    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey: [KEY_WALLET, 'advances', 'summary'],
        queryFn: () => walletAPI.getAdvancesSummary(),
        enabled: isAuthenticated,
        staleTime: 1000 * 60 * 2, // 2 minutes
    });

    return {
        summary: data,
        isLoading,
        isError,
        error,
        refetch,
    };
}
