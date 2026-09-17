import { useQuery } from '@tanstack/react-query'

import type { Id } from '@/types/base'

import { getChatMessagesService } from '../chatService'

import { chatMessagesKey } from './messagesCache'

/** Intervalo do polling REST enquanto o socket está fora. */
export const CHAT_OFFLINE_POLL_MS = 15_000

/**
 * Mensagens de uma conversa. `staleTime: 0` + `refetchOnMount: 'always'`: o default
 * global de 5 min servia a conversa antiga ao reabrir, sem a resposta do operador (F3).
 */
export function useGetChatMessages(
    chatId: Id | undefined,
    options: { refetchIntervalMs?: number | false } = {},
) {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: chatMessagesKey(String(chatId ?? '')),
        queryFn: () => getChatMessagesService(chatId as Id),
        enabled: !!chatId,
        retry: false,
        staleTime: 0,
        refetchOnMount: 'always',
        refetchInterval: options.refetchIntervalMs ?? false,
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
