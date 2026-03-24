// src/domain/agility/wallet/useCase/useFinancialSummary.ts

import { useMemo } from 'react';

import { useGetPayments } from '@/domain/agility/finance';
import { useGetWallet, useGetAdvancesSummary } from '@/domain/agility/wallet';

export interface FinancialSummary {
    // Wallet
    availableBalance: number;
    totalBalance: number;
    blockedBalance: number;
    hasBankInfo: boolean;

    // Payments (current month)
    totalReceived: number;
    pendingPayments: number;
    totalTrips: number;

    // Advances
    pendingAdvances: number;
    advancesCount: number;
    overdueAdvances: number;
}

export function useFinancialSummary() {
    const { wallet, isLoading: isLoadingWallet } = useGetWallet();
    const { payments, isLoading: isLoadingPayments } = useGetPayments();
    const { summary: advancesSummary, isLoading: isLoadingAdvances } = useGetAdvancesSummary();

    const isLoading = isLoadingWallet || isLoadingPayments || isLoadingAdvances;

    const summary = useMemo<FinancialSummary>(() => {
        // Calculate payments stats
        const approvedPayments = payments?.filter(p => p.status === 'APPROVED') ?? [];
        const pendingPaymentsList = payments?.filter(p => p.status === 'PENDING') ?? [];

        const totalReceived = approvedPayments.reduce(
            (sum, p) => sum + (p.receivedValue || 0),
            0,
        );

        const pendingPayments = pendingPaymentsList.reduce(
            (sum, p) => {
                const pending = p.expectedValue - (p.receivedValue || 0);
                return sum + Math.max(pending, 0);
            },
            0,
        );

        return {
            // Wallet
            availableBalance: wallet?.availableBalance ?? 0,
            totalBalance: wallet?.balance ?? 0,
            blockedBalance: wallet?.blockedBalance ?? 0,
            hasBankInfo: wallet?.hasBankInfo ?? false,

            // Payments
            totalReceived,
            pendingPayments,
            totalTrips: payments?.length ?? 0,

            // Advances
            pendingAdvances: advancesSummary?.totalPending ?? 0,
            advancesCount: advancesSummary?.count ?? 0,
            overdueAdvances: advancesSummary?.overdueCount ?? 0,
        };
    }, [wallet, payments, advancesSummary]);

    return {
        summary,
        isLoading,
        wallet,
        payments,
        advancesSummary,
    };
}
