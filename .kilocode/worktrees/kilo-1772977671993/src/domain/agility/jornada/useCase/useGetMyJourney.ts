import { useQuery } from '@tanstack/react-query'

import { KEY_JOURNEY } from '@/domain/queryKeys'
import { useUserAuthInfoZustand } from '@/store/userAuthInfo/useUserAuthInfoStore'

import { journeyService } from '../journeyService'

export function useGetMyJourney() {
    const { userAuth } = useUserAuthInfoZustand()
    const driverId = userAuth?.driverId

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

    const jornada = data?.result ?? null

    return {
        jornada,
        isLoading,
        isError,
        error,
        refetch,
        isRefetching,
        driverId,
    }
}