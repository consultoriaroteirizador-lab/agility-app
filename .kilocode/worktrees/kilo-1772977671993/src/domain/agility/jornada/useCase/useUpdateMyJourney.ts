import { BaseResponse, MutationOptions, useMutationService } from '@/api'
import { useUserAuthInfoZustand } from '@/store/userAuthInfo/useUserAuthInfoStore'

import { journeyService } from '../journeyService'
import type { UpdateJornadaRequest, JornadaResponse } from '../types'

export function useUpdateMyJourney(options?: MutationOptions<BaseResponse<JornadaResponse>>) {
    const { userAuth } = useUserAuthInfoZustand()
    const driverId = userAuth?.driverId

    const mutation = useMutationService<JornadaResponse, UpdateJornadaRequest>({
        action: (payload: UpdateJornadaRequest) => {
            if (!driverId) {
                throw new Error('Driver ID não encontrado')
            }
            return journeyService.updateMyJourney(driverId, payload)
        },
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        updateJourney: (variables: UpdateJornadaRequest) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
        driverId,
    }
}