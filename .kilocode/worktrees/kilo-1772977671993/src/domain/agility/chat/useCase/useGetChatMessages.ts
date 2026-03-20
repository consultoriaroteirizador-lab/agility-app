import { useQuery } from '@tanstack/react-query'

import { KEY_CHATS } from '@/domain/queryKeys'
import type { Id } from '@/types/base'

import { getChatMessagesService } from '../chatService'

export function useGetChatMessages(chatId: Id | undefined) {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: [KEY_CHATS, chatId, 'messages'],
        queryFn: () => getChatMessagesService(chatId as Id),
        enabled: !!chatId,
        retry: false,
    })

    return {
        messages: data?.result ?? [],
        isLoading,
        isError,
        refetch,
        isRefetching,
        response: data,
    }
}
