import { useQuery } from '@tanstack/react-query'

import type { Id } from '@/types/base'

import { getChatMessagesService } from '../chatService'

import { chatMessagesKey } from './messagesCache'

export function useGetChatMessages(chatId: Id | undefined) {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: chatMessagesKey(String(chatId ?? '')),
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
