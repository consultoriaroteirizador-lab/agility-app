import { useQueryClient } from '@tanstack/react-query'

import { BaseResponse, MutationOptions, useMutationService } from '@/api'
import { moneyChangedKeys } from '@/domain/queryKeys'
import type { Id } from '@/types/base'

import type { RoutingResponse } from '../dto'
import { routingService } from '../routingService'

export function useCompleteRouting(options?: MutationOptions<BaseResponse<RoutingResponse>>) {
    const queryClient = useQueryClient()

    const mutation = useMutationService<RoutingResponse, Id>({
        action: (id: Id) => routingService.complete(id),
        onSuccess: async (data) => {
            // A conclusão da rota cria a parcela de frete (F2): saldo, "Frete a liberar" e
            // extrato mudam. Invalida antes do onSuccess de quem chama, que costuma navegar.
            for (const queryKey of moneyChangedKeys()) {
                void queryClient.invalidateQueries({ queryKey })
            }
            await options?.onSuccess?.(data)
        },
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        completeRouting: (variables: Id) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}
