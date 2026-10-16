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
 * A troca de equipamento na parada (fase 3D). Sem atualização otimista: recarrega o pedido
 * (`[KEY_SERVICES, serviceId]`, a chave do `useFindOneService` da parada) para a tela mostrar A
 * "Trocado" e B "No lugar de". A falha volta pela promessa e quem chama mostra o toast; o `onError`
 * vazio impede o modal de erro por cima, como no `useCheckLine`. Recarrega também na falha: um timeout
 * pode chegar depois de o servidor gravar, e um 400 ("A linha já foi trocada") diz que a tela está velha.
 * No sucesso, espera o recarregamento (quem chama fecha o modal com a lista já atualizada); na falha,
 * não espera, para o toast não ficar atrás de um segundo timeout.
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
            const recarregar = () => queryClient.invalidateQueries({ queryKey: [KEY_SERVICES, variables.serviceId] })
            let response: Awaited<ReturnType<typeof mutateAsync>>
            try {
                response = await mutateAsync(variables)
            } catch (error) {
                void recarregar()
                throw error
            }
            await recarregar()
            return response
        },
        [mutateAsync, queryClient],
    )

    return { swapLineAsync, isLoading: mutation.isLoading }
}
