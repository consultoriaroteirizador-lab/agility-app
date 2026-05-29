import { useCallback } from 'react'

import { BaseResponse, MutationOptions, useMutationService } from '@/api'
import type { Id } from '@/types/base'

import { driverService } from '../driverService'
import type { UpdateDriverRequest, DriverResponse } from '../dto'

interface UpdateDriverParams {
    id: Id
    payload: UpdateDriverRequest
}

export function useUpdateDriver(options?: MutationOptions<BaseResponse<DriverResponse>>) {
    const mutation = useMutationService<DriverResponse, UpdateDriverParams>({
        action: (request: UpdateDriverParams) => driverService.update(request.id, request.payload),
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })

    // Identidade estável (vide useSaveServiceDraft): este hook é consumido por
    // useLocationTracking, que retorna callbacks dependentes dele. Sem a
    // estabilização, qualquer consumidor com `updateDriver` em dep array
    // de useEffect/useCallback re-dispara em cada render do mutation.
    const { mutate } = mutation
    const updateDriver = useCallback(
        (variables: UpdateDriverParams) => mutate(variables),
        [mutate],
    )

    return {
        isLoading: mutation.isLoading,
        updateDriver,
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}

