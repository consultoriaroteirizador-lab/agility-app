import { useQuery } from '@tanstack/react-query'

import { collaboratorService } from '@/domain/agility/collaborator/collaboratorService'
import { driverService } from '@/domain/agility/driver/driverService'
import { KEY_COLLABORATORS, KEY_DRIVER, KEY_JOURNEY } from '@/domain/queryKeys'
import { useAuthCredentialsService } from '@/services'

import { journeyService } from '../journeyService'

export function useGetMyJourney() {
    const { userAuth } = useAuthCredentialsService()
    const collaboratorId = userAuth?.id
    const userDriverId = userAuth?.driverId

    // Busca o driver se não tiver driverId no userAuth
    const { data: driverData, isLoading: isLoadingDriver } = useQuery({
        queryKey: [KEY_DRIVER, 'by-collaborator', collaboratorId],
        queryFn: async () => {
            if (!collaboratorId) return null
            // Se já tem driverId no userAuth, usa ele
            if (userDriverId) return { id: userDriverId }
            // Caso contrário, busca o driver pelo collaboratorId
            const response = await driverService.findByCollaboratorId(collaboratorId)
            return response.result
        },
        enabled: !!collaboratorId,
        retry: false,
    })

    const driverId = driverData?.id ?? null

    // Busca a jornada usando o driverId
    const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
        queryKey: [KEY_JOURNEY, 'my', driverId],
        queryFn: async () => {
            if (!driverId) {
                return null
            }
            const result = await journeyService.getMyJourney(driverId)
            return result
        },
        enabled: !!driverId,
        retry: false,
    })

    // Busca o perfil do colaborador para obter workSchedule completo
    const { data: profileData, isLoading: isLoadingProfile } = useQuery({
        queryKey: [KEY_COLLABORATORS, 'profile', collaboratorId],
        queryFn: async () => {
            if (!collaboratorId) return null
            const result = await collaboratorService.getProfile()
            return result.result
        },
        enabled: !!collaboratorId,
        retry: false,
    })

    // Mescla dados do driver com dados do collaborator
    const driverResult = data?.result
    const workSchedule = profileData?.workSchedule

    // Se tiver workSchedule, adiciona os campos extras
    const jornada = driverResult ? {
        ...driverResult,
        // Campos do workSchedule (se disponível)
        tipoContrato: workSchedule?.tipoContrato,
        breakInterval: workSchedule?.breakInterval,
        restInterval: workSchedule?.restInterval,
        daysOffArray: workSchedule?.daysOff,
    } : null

    return {
        jornada,
        isLoading: isLoadingDriver || isLoading || isLoadingProfile,
        isError,
        error,
        refetch,
        isRefetching,
        driverId,
    }
}