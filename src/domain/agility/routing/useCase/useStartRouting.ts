import { useQueryClient } from '@tanstack/react-query'

import { BaseResponse, MutationOptions, useMutationService } from '@/api'
import { KEY_ROUTINGS } from '@/domain/queryKeys'
import type { Id } from '@/types/base'

import type { RoutingResponse } from '../dto'
import { routingService } from '../routingService'

export function useStartRouting(options?: MutationOptions<BaseResponse<RoutingResponse>>) {
    const queryClient = useQueryClient()

    const mutation = useMutationService<RoutingResponse, Id>({
        action: (id: Id) => routingService.start(id),
        onSuccess: async (data) => {
            // A tela da rota lê `[KEY_ROUTINGS, id]`, que a tela da oferta deixa em cache como
            // ASSIGNED (fresco por 5 min): sem invalidar, a parada não abre até recarregar o app.
            // O prefixo inteiro também refaz as listas, que mostram o status da rota.
            void queryClient.invalidateQueries({ queryKey: [KEY_ROUTINGS] })
            await options?.onSuccess?.(data)
        },
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        startRouting: (variables: Id) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}
