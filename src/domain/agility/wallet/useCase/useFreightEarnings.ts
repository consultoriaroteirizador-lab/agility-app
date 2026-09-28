// src/domain/agility/wallet/useCase/useFreightEarnings.ts
import { useQuery } from '@tanstack/react-query';

import { fetchAllPages } from '@/domain/hooks/pagination';
import { KEY_WALLET } from '@/domain/queryKeys';
import { useAuthCredentialsService } from '@/services';

import { TransactionStatus, TransactionType } from '../dto/types';
import { groupReleasedFreight, totalReleasedCents } from '../freightEarnings';
import { walletAPI } from '../walletAPI';

/** Máximo aceito pelo back (`@Max(100)` em ListTransactionsDto). */
const EARNINGS_PAGE_SIZE = 100;
/** Teto por tipo: 2000 lançamentos. Acima disso a tela avisa "valores parciais" (R4). */
const EARNINGS_MAX_PAGES = 20;

/**
 * Frete liberado desde `startDate` (ISO). O back filtra UM `type` exato por chamada: são
 * duas buscas (liberações e débitos manuais, dos quais só o estorno de frete conta).
 */
export function useFreightEarnings(startDate: string) {
    const { authCredentials } = useAuthCredentialsService();
    const isAuthenticated = !!authCredentials?.accessToken && !!authCredentials?.tenantId;

    const query = useQuery({
        queryKey: [KEY_WALLET, 'earnings', startDate],
        queryFn: async () => {
            const buscarTipo = (type: TransactionType) =>
                fetchAllPages(
                    (page) =>
                        walletAPI.getTransactions({ type, status: TransactionStatus.COMPLETED, startDate, page, limit: EARNINGS_PAGE_SIZE }),
                    EARNINGS_MAX_PAGES,
                );
            const [liberacoes, debitos] = await Promise.all([
                buscarTipo(TransactionType.FREIGHT_RELEASE),
                buscarTipo(TransactionType.MANUAL_DEBIT),
            ]);
            const items = groupReleasedFreight([...liberacoes.items, ...debitos.items]);
            return { items, totalCents: totalReleasedCents(items), truncated: liberacoes.truncated || debitos.truncated };
        },
        enabled: isAuthenticated,
        staleTime: 60_000,
    });

    return {
        earnings: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
        isRefetching: query.isRefetching,
    };
}
