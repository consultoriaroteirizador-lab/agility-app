import { useQuery } from '@tanstack/react-query'

import { KEY_CHATS } from '@/domain/queryKeys'
import type { Id } from '@/types/base'

import { listChatsByUserService } from '../chatService'

export function useFindChatsByUser(userId: Id | undefined) {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: [KEY_CHATS, userId],
        queryFn: () => listChatsByUserService(userId as Id, 'DRIVER'),
        enabled: !!userId,
        retry: false,
    })

    return {
        chats: data?.result ?? [],
        isLoading,
        isError,
        refetch,
        isRefetching,
        response: data,
    }
}

