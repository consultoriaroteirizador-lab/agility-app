import { useQuery } from '@tanstack/react-query'

import { KEY_CHATS } from '@/domain/queryKeys'
import type { Id } from '@/types/base'

import { getActiveChatByUserService } from '../chatService'

export function useFindActiveChatByUser(userId: Id | undefined) {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: [KEY_CHATS, userId, 'active'],
        queryFn: () => getActiveChatByUserService(userId as Id, 'DRIVER'),
        enabled: !!userId,
        retry: false,
        // Decide entre "Continuar chamado" e "Nova conversa": nunca servir do cache velho.
        staleTime: 0,
        refetchOnMount: 'always',
    })

    return {
        activeChat: data?.result ?? null,
        isLoading,
        isError,
        refetch,
        isRefetching,
        response: data,
    }
}
