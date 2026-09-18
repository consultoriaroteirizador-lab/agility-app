import { BaseResponse, MutationOptions, useMutationService } from '@/api'
import type { Id } from '@/types/base'

import type { ServiceResponse, ApplyOccurrenceRequest, OccurrenceOutcome } from '../dto'
import { serviceService } from '../serviceService'

/**
 * `awaitingReturn`: a mercadoria deste pedido ainda precisa voltar ao CD. Vale
 * inclusive para `CANCELED` desde que o cancelamento de pedido já despachado
 * passou a devolver (backend, spec 2026-09-18). Opcional porque backend anterior
 * a essa versão não mandava o campo.
 */
type OccurrenceResult = ServiceResponse & { occurrenceOutcome: OccurrenceOutcome; awaitingReturn?: boolean }

interface RegisterOccurrenceParams {
    id: Id
    payload: ApplyOccurrenceRequest
}

export function useRegisterOccurrence(options?: MutationOptions<BaseResponse<OccurrenceResult>>) {
    const mutation = useMutationService<OccurrenceResult, RegisterOccurrenceParams>({
        action: (request: RegisterOccurrenceParams) => serviceService.applyOccurrence(request.id, request.payload),
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        registerOccurrence: (variables: RegisterOccurrenceParams) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}
