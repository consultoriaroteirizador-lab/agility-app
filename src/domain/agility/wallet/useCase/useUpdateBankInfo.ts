// src/domain/agility/wallet/useCase/useUpdateBankInfo.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { KEY_WALLET } from '@/domain/queryKeys';

import { UpdateBankInfoRequest } from '../dto';
import { walletAPI } from '../walletAPI';

export function useUpdateBankInfo() {
    const queryClient = useQueryClient();

    const {
        mutate: updateBankInfo,
        isPending,
        isError,
        error,
        data,
        reset,
    } = useMutation({
        mutationFn: (data: UpdateBankInfoRequest) => walletAPI.updateBankInfo(data),
        onSuccess: () => {
            // Invalidate wallet queries to refresh data
            queryClient.invalidateQueries({ queryKey: [KEY_WALLET] });
        },
    });

    return {
        updateBankInfo,
        isPending,
        isError,
        error,
        data,
        reset,
    };
}
