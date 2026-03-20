import { useQuery } from '@tanstack/react-query'

import { KEY_TICKETS } from '@/domain/queryKeys'

import { getAllTicketsService, getOpenTicketsService } from '../ticketService'

interface UseFindTicketsParams {
    status?: string
    priority?: string
    limit?: number
    offset?: number
    enabled?: boolean
}

export function useFindTickets(params: UseFindTicketsParams = {}) {
    const { status, priority, limit, offset, enabled = true } = params

    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: [KEY_TICKETS, 'all', { status, priority, limit, offset }],
        queryFn: () => getAllTicketsService({ limit, offset }),
        enabled,
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

export function useOpenTickets(enabled = true) {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: [KEY_TICKETS, 'open'],
        queryFn: () => getOpenTicketsService(),
        enabled,
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
