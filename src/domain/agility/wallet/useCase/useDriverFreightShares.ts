// src/domain/agility/wallet/useCase/useDriverFreightShares.ts

import { useQuery } from '@tanstack/react-query';

import { KEY_WALLET } from '@/domain/queryKeys';
import { useAuthCredentialsService } from '@/services';

import type { FreightShareStatus } from '../dto/types';
import { walletAPI } from '../walletAPI';

/** Uma página basta para as telas desta fase (R10 da F5c); passou disso, a tela diz "Mostrando N de M". */
export const FREIGHT_SHARES_LIMIT = 50;

/**
 * Parcelas do motorista (F6). Sob `[KEY_WALLET]`: conclusão, saque e push já invalidam. Erro
 * devolve `page: null`, nunca lista vazia (vazio é resposta legítima: rota sem frete para ele).
 */
export function useDriverFreightShares(
    params: { routingId?: string; status?: FreightShareStatus },
    options: { enabled?: boolean } = {},
) {
    const { authCredentials } = useAuthCredentialsService();
    const isAuthenticated = !!authCredentials?.accessToken && !!authCredentials?.tenantId;
    const routingId = params.routingId ?? null;
    const status = params.status ?? null;

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: [KEY_WALLET, 'freight-shares', routingId, status],
        queryFn: () =>
            walletAPI.getFreightShares({
                ...(routingId ? { routingId } : {}),
                ...(status ? { status } : {}),
                page: 1,
                limit: FREIGHT_SHARES_LIMIT,
            }),
        enabled: isAuthenticated && (options.enabled ?? true),
        staleTime: 1000 * 60,
    });

    return { page: data ?? null, isLoading, isError, refetch };
}
