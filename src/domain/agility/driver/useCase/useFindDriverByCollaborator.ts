import { useQuery } from '@tanstack/react-query'
import type { Id } from '@/types/base'

import { driverService } from '../driverService'
import type { DriverResponse } from '../dto'

/**
 * Hook para buscar o driver pelo collaboratorId
 * NOTA: Este hook não é mais necessário pois o driverId já vem no profile do collaborator.
 * Use userAuth.driverId diretamente.
 * @deprecated Use userAuth.driverId diretamente
 */
export function useFindDriverByCollaborator(collaboratorId?: Id | null) {
    const { data, isLoading, isError, error, refetch } = useQuery<DriverResponse | null>({
        queryKey: ['driver', 'by-collaborator', collaboratorId],
        queryFn: async () => {
            if (!collaboratorId) return null
            const response = await driverService.findByCollaboratorId(collaboratorId)
            return response.result ?? null
        },
        enabled: !!collaboratorId,
        retry: false,
    })

    return {
        driver: data,
        driverId: data?.id,
        isLoading,
        isError,
        error,
        refetch,
    }
}
