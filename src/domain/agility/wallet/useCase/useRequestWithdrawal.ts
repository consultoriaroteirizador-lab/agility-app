// src/domain/agility/wallet/useCase/useRequestWithdrawal.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { KEY_WALLET } from '@/domain/queryKeys';

import { CreateWithdrawalRequest } from '../dto';
import { walletAPI } from '../walletAPI';

/**
 * `requestWithdrawal` é `mutateAsync`: REJEITA no erro do back. Quem chama mostra a
 * mensagem com `mensagemDaApi` (antes era `mutate`, e o toast de sucesso aparecia com o
 * saque recusado).
 */
export function useRequestWithdrawal() {
    const queryClient = useQueryClient();

    const { mutateAsync, isPending } = useMutation({
        mutationFn: (data: CreateWithdrawalRequest) => walletAPI.requestWithdrawal(data),
        onSuccess: () => {
            // Saldo, extrato (WITHDRAWAL_HOLD) e Meus saques: tudo mora sob KEY_WALLET.
            void queryClient.invalidateQueries({ queryKey: [KEY_WALLET] });
        },
    });

    return { requestWithdrawal: mutateAsync, isPending };
}
