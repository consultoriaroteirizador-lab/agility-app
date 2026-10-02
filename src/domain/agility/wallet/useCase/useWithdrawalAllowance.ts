// src/domain/agility/wallet/useCase/useWithdrawalAllowance.ts

import { useQuery } from '@tanstack/react-query';

import { KEY_WALLET } from '@/domain/queryKeys';
import { useAuthCredentialsService } from '@/services';

import { walletAPI } from '../walletAPI';
import { toWithdrawalAllowance } from '../withdrawalAllowance';

/**
 * Política de saque com dívida e o teto do saque (F3). Sob `[KEY_WALLET]` de propósito: o
 * saque, a conclusão de parada e o push já invalidam esse prefixo.
 */
export function useWithdrawalAllowance() {
    const { authCredentials } = useAuthCredentialsService();
    const isAuthenticated = !!authCredentials?.accessToken && !!authCredentials?.tenantId;

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: [KEY_WALLET, 'summary'],
        queryFn: async () => toWithdrawalAllowance(await walletAPI.getSummary()),
        enabled: isAuthenticated,
        staleTime: 1000 * 60 * 2,
    });

    return { allowance: data ?? null, isLoading, isError, refetch };
}
