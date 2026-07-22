import { BaseResponse, MutationOptions, useMutationService } from '@/api'
import type { Id } from '@/types/base'

import type { ServiceResponse, ApplyOccurrenceRequest, OccurrenceOutcome } from '../dto'
import { serviceService } from '../serviceService'

type OccurrenceResult = ServiceResponse & { occurrenceOutcome: OccurrenceOutcome }

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
