import { useQuery } from '@tanstack/react-query'

import { KEY_TICKETS } from '@/domain/queryKeys'
import type { Id } from '@/types/base'

import { getTicketByChatIdService } from '../ticketService'

export function useGetTicketByChatId(chatId: Id | undefined) {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: [KEY_TICKETS, 'chat', chatId],
        queryFn: () => getTicketByChatIdService(chatId as Id),
        enabled: !!chatId,
        retry: false,
    })

    return {
        ticket: data?.result,
        isLoading,
        isError,
        refetch,
        isRefetching,
        response: data,
    }
}
