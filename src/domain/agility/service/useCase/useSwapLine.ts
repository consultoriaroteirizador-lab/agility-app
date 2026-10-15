import { useCallback } from 'react'

import { useQueryClient } from '@tanstack/react-query'

import { useMutationService } from '@/api'
import { KEY_SERVICES } from '@/domain/queryKeys'
import type { Id } from '@/types/base'

import type { SwapLineRequest, SwapLineResponse } from '../dto/response/service-line.response'
import { serviceService } from '../serviceService'

export type SwapLineVariables = {
    serviceId: Id
    lineId: Id
    data: SwapLineRequest
}

/**
 * A troca de equipamento na parada (fase 3D). Sem atualização otimista: no sucesso, recarrega o pedido
 * (`[KEY_SERVICES, serviceId]`, a chave do `useFindOneService` da parada) para a tela mostrar A
 * "Trocado" e B "No lugar de". A falha volta pela promessa e quem chama mostra o toast; o `onError`
 * vazio impede o modal de erro por cima, como no `useCheckLine`. Invalida só no sucesso: a falha não
 * mudou nada no backend.
 */
export function useSwapLine() {
    const queryClient = useQueryClient()
    const mutation = useMutationService<SwapLineResponse, SwapLineVariables>({
        action: ({ serviceId, lineId, data }) => serviceService.swapLine(serviceId, lineId, data),
        onError: () => {},
    })
    const { mutateAsync } = mutation

    const swapLineAsync = useCallback(
        async (variables: SwapLineVariables) => {
            const response = await mutateAsync(variables)
            await queryClient.invalidateQueries({ queryKey: [KEY_SERVICES, variables.serviceId] })
            return response
        },
        [mutateAsync, queryClient],
    )

    return { swapLineAsync, isLoading: mutation.isLoading }
}
