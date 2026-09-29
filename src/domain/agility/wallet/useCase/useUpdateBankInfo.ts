// src/domain/agility/wallet/useCase/useUpdateBankInfo.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { KEY_WALLET } from '@/domain/queryKeys';

import { UpdateBankInfoRequest } from '../dto';
import { walletAPI } from '../walletAPI';

/** `updateBankInfo` é `mutateAsync`: REJEITA no erro do back (antes, `mutate` = falso sucesso). */
export function useUpdateBankInfo() {
    const queryClient = useQueryClient();

    const { mutateAsync, isPending } = useMutation({
        mutationFn: (data: UpdateBankInfoRequest) => walletAPI.updateBankInfo(data),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: [KEY_WALLET] });
        },
    });

    return { updateBankInfo: mutateAsync, isPending };
}
