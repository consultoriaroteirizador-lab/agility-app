// src/domain/agility/wallet/useCase/useWalletBreakdown.ts

import { useMemo } from 'react';

import { useGetAdvancesSummary } from './useGetAdvances';
import { useGetWallet } from './useGetWallet';

export interface WalletBreakdown {
    /** Ganhos de uberização (serviços próprios do motorista) */
    uberizationBalance: number;

    /** Total de adiantamentos a devolver para a empresa */
    advanceObligations: number;

    /** Saldo real disponível para saque */
    netAvailableBalance: number;

    /** Indica se há adiantamentos vencidos */
    hasOverdueAdvances: boolean;

    /** Quantidade de adiantamentos pendentes */
    advancesCount: number;
}

/**
 * Hook que calcula o breakdown do saldo da carteira,
 * diferenciando entre ganhos próprios (uberização) e adiantamentos.
 *
 * Fórmula:
 * - uberizationBalance = availableBalance (saldo disponível vindo do backend, já líquido de dívidas registradas como transações)
 * - advanceObligations = total de DriverAdvance pendentes/parciais (dívidas externas à wallet, ex: cash recebido por colaborador)
 * - netAvailableBalance = max(0, availableBalance - advanceObligations) — quanto realmente sobra após honrar as devoluções pendentes
 */
export function useWalletBreakdown() {
    const { wallet, isLoading: isLoadingWallet, isError: isWalletError, refetch: refetchWallet, isRefetching } = useGetWallet();
    const { summary: advancesSummary, isLoading: isLoadingAdvances, isError: isAdvancesError, refetch: refetchAdvances } = useGetAdvancesSummary();

    const isLoading = isLoadingWallet || isLoadingAdvances;
    const isError = isWalletError || isAdvancesError;

    const breakdown = useMemo<WalletBreakdown>(() => {
        const advanceObligations = advancesSummary?.totalPending ?? 0;
        const availableBalance = wallet?.availableBalance ?? 0;
        const uberizationBalance = availableBalance;
        const netAvailableBalance = Math.max(0, availableBalance - advanceObligations);

        return {
            uberizationBalance,
            advanceObligations,
            netAvailableBalance,
            hasOverdueAdvances: (advancesSummary?.overdueCount ?? 0) > 0,
            advancesCount: advancesSummary?.count ?? 0,
        };
    }, [wallet, advancesSummary]);

    const refetch = () => {
        refetchWallet();
        refetchAdvances();
    };

    return {
        breakdown,
        wallet,
        advancesSummary,
        isLoading,
        isError,
        refetch,
        isRefetching
    };
}
