// src/domain/agility/wallet/useCase/useRequestWithdrawal.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { KEY_WALLET } from '@/domain/queryKeys';

import { CreateWithdrawalRequest } from '../dto';
import { walletAPI } from '../walletAPI';

export function useRequestWithdrawal() {
    const queryClient = useQueryClient();

    const {
        mutate: requestWithdrawal,
        isPending,
        isError,
        error,
        data,
        reset,
    } = useMutation({
        mutationFn: (data: CreateWithdrawalRequest) => walletAPI.requestWithdrawal(data),
        onSuccess: () => {
            // Invalidate wallet queries to refresh balance
            queryClient.invalidateQueries({ queryKey: [KEY_WALLET] });
        },
    });

    return {
        requestWithdrawal,
        isPending,
        isError,
        error,
        data,
        reset,
    };
}
