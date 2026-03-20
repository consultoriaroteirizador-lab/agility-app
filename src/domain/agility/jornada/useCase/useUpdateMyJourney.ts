import { BaseResponse, MutationOptions, useMutationService } from '@/api'
import { driverService } from '@/domain/agility/driver/driverService'
import { useAuthCredentialsService } from '@/services'

import { journeyService } from '../journeyService'
import type { UpdateJornadaRequest, JornadaResponse } from '../types'

export function useUpdateMyJourney(options?: MutationOptions<BaseResponse<JornadaResponse>>) {
    const { userAuth } = useAuthCredentialsService()
    const userDriverId = userAuth?.driverId
    const collaboratorId = userAuth?.id

    const mutation = useMutationService<JornadaResponse, UpdateJornadaRequest>({
        action: async (payload: UpdateJornadaRequest) => {
            // Tenta primeiro usar o endpoint de Collaborator (suporta mais campos)
            // Este endpoint usa o token JWT para identificar o usuário
            if (collaboratorId) {
                try {
                    return await journeyService.updateMyWorkSchedule(payload)
                } catch (error) {
                    // Se falhar (ex: endpoint não disponível), fallback para Driver
                    console.warn('Falha ao atualizar via Collaborator, tentando via Driver:', error)
                }
            }

            // Fallback: usa o endpoint de Driver
            let driverId = userDriverId

            // Se não tem driverId no userAuth, busca pelo collaboratorId
            if (!driverId && collaboratorId) {
                const response = await driverService.findByCollaboratorId(collaboratorId)
                driverId = response.result?.id
            }

            if (!driverId) {
                throw new Error('Driver ID não encontrado. Verifique se seu usuário está vinculado a um motorista.')
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
        driverId: userDriverId,
    }
}