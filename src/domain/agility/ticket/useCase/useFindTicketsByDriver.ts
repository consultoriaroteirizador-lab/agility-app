import { useQuery } from '@tanstack/react-query'

import { KEY_TICKETS } from '@/domain/queryKeys'
import type { Id } from '@/types/base'

import { getTicketsByDriverService } from '../ticketService'

export function useFindTicketsByDriver(driverId: Id | undefined) {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: [KEY_TICKETS, 'driver', driverId],
        queryFn: () => getTicketsByDriverService(driverId as Id),
        enabled: !!driverId,
        retry: false,
    })

    return {
        tickets: data?.result ?? [],
        isLoading,
        isError,
        refetch,
        isRefetching,
        response: data,
    }
}
