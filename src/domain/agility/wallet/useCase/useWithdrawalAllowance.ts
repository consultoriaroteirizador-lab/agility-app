// src/domain/agility/wallet/useCase/useWithdrawalAllowance.ts

import { useQuery } from '@tanstack/react-query';

import { KEY_WALLET } from '@/domain/queryKeys';
import { useAuthCredentialsService } from '@/services';

import type { WalletSummaryResponse } from '../dto';
import { walletAPI } from '../walletAPI';
import { cashReturnDueDaysOf, toWithdrawalAllowance } from '../withdrawalAllowance';

/**
 * `GET /wallet/summary`, guardado CRU sob `[KEY_WALLET, 'summary']`: cada leitura sai por `select`
 * (F5c). Duas formas de dado na mesma chave se sobrescreviam no cache. Sob `[KEY_WALLET]` de
 * propósito: o saque, a conclusão de parada e o push já invalidam esse prefixo.
 */
function useWalletSummary<T>(select: (s: WalletSummaryResponse) => T, enabled = true) {
    const { authCredentials } = useAuthCredentialsService();
    const isAuthenticated = !!authCredentials?.accessToken && !!authCredentials?.tenantId;

    return useQuery({
        queryKey: [KEY_WALLET, 'summary'],
        queryFn: () => walletAPI.getSummary(),
        select,
        enabled: isAuthenticated && enabled,
        staleTime: 1000 * 60 * 2,
    });
}

/** Política de saque com dívida e o teto do saque (F3). */
export function useWithdrawalAllowance() {
    const { data, isLoading, isError, refetch } = useWalletSummary(toWithdrawalAllowance);
    return { allowance: data ?? null, isLoading, isError, refetch };
}

/** Prazo de devolução do dinheiro vivo em dias (F6). `null` = não sabe (carregando, erro, back antigo). */
export function useCashReturnDueDays(options: { enabled?: boolean } = {}): number | null {
    const { data } = useWalletSummary(cashReturnDueDaysOf, options.enabled ?? true);
    return data ?? null;
}
