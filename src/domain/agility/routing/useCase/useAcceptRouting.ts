import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { BaseResponse } from '@/api'
import { KEY_ROUTINGS } from '@/domain/queryKeys'
import type { Id } from '@/types/base'

import type { AcceptRoutingRequest, RoutingResponse } from '../dto'
import { routingService } from '../routingService'

interface UseAcceptRoutingOptions {
    onSuccess?: (data: BaseResponse<RoutingResponse>) => void
    onError?: (error: BaseResponse<any>) => void
}

/** Liga quando o backend com `expectedTotalValue` estiver em produção (forbidNonWhitelisted recusa antes). */
export const ENVIA_VALOR_ESPERADO = false

export function payloadDeAceite(
    userLocation: { coords: { latitude: number; longitude: number } } | null | undefined,
    totalValue: number | null | undefined,
): AcceptRoutingRequest {
    return {
        driverLatitude: userLocation?.coords.latitude,
        driverLongitude: userLocation?.coords.longitude,
        ...(ENVIA_VALOR_ESPERADO && typeof totalValue === 'number' ? { expectedTotalValue: totalValue } : {}),
    }
}

export function useAcceptRouting(options?: UseAcceptRoutingOptions) {
    const queryClient = useQueryClient()

    const mutation = useMutation<
        BaseResponse<RoutingResponse>,
        BaseResponse<any>,
        { routingId: Id; payload?: AcceptRoutingRequest }
    >({
        mutationFn: ({ routingId, payload }: { routingId: Id; payload?: AcceptRoutingRequest }) =>
            routingService.acceptRouting(routingId, payload),
        onSuccess: (data: BaseResponse<RoutingResponse>) => {
            // Invalidate broadcasting and my-routings queries
            if (data?.result?.id) {
                queryClient.invalidateQueries({ queryKey: [KEY_ROUTINGS, 'broadcasting'] })
                queryClient.invalidateQueries({ queryKey: [KEY_ROUTINGS, 'my-routings'] })
                queryClient.invalidateQueries({ queryKey: [KEY_ROUTINGS, data.result.id] })
            }
            options?.onSuccess?.(data)
        },
        onError: (error: BaseResponse<any>) => {
            // Um 409 (tomada por outro motorista) ou um timeout que na verdade
            // aplicou no servidor pode significar que o estado mudou mesmo com o
            // aceite falhando aqui — invalida para a lista/tela não seguirem
            // mostrando a oferta como se ainda estivesse disponível.
            queryClient.invalidateQueries({ queryKey: [KEY_ROUTINGS, 'broadcasting'] })
            queryClient.invalidateQueries({ queryKey: [KEY_ROUTINGS, 'my-routings'] })
            options?.onError?.(error)
        },
    })

    return {
        acceptRouting: mutation.mutate,
        acceptRoutingAsync: mutation.mutateAsync,
        isLoading: mutation.isPending,
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
        error: mutation.error,
        data: mutation.data?.result,
        response: mutation.data,
        reset: mutation.reset,
    }
}

