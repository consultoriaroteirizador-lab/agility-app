// src/domain/agility/wallet/useCase/useGetPendingReceivables.ts

import { useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';

import { KEY_WALLET } from '@/domain/queryKeys';
import { useAuthCredentialsService } from '@/services';

import { TransactionStatus, TransactionType } from '../dto/types';
import { walletAPI } from '../walletAPI';

/**
 * Hook para listar transações de crédito ainda PENDING.
 *
 * No backend, `creditAsReceivable()` cria DriverWalletTransaction com
 * status=PENDING e type=CREDIT, indicando que o valor foi creditado mas está
 * bloqueado até o admin liberar (ver wallet.service.ts:releaseReceivable).
 *
 * Esses recebíveis se manifestam aqui como o motorista vê na carteira:
 * "valor aguardando confirmação da empresa".
 */
export function useGetPendingReceivables() {
    const { authCredentials } = useAuthCredentialsService();
    const isAuthenticated = !!authCredentials?.accessToken && !!authCredentials?.tenantId;

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: [KEY_WALLET, 'transactions', 'pending-receivables'],
        queryFn: () => walletAPI.getTransactions({
            status: TransactionStatus.PENDING as string,
            type: TransactionType.CREDIT as string,
            limit: 50,
        }),
        enabled: isAuthenticated,
        staleTime: 1000 * 60 * 2,
    });

    const totalPendingReceivable = useMemo(() => {
        return (data?.data ?? []).reduce((sum, tx) => sum + (tx.amount ?? 0), 0);
    }, [data]);

    return {
        receivables: data?.data ?? [],
        totalPendingReceivable,
        count: data?.data?.length ?? 0,
        isLoading,
        isError,
        refetch,
    };
}
