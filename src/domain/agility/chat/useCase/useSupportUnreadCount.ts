import { useQuery } from '@tanstack/react-query';

import { KEY_CHATS } from '@/domain/queryKeys';
import { useAuthCredentialsService } from '@/services';

import { getUnreadCountService } from '../chatService';

import { useFindActiveChatByUser } from './useFindActiveChatByUser';

/**
 * Polling leve do badge do Menu (1 GET/min, só com chat ativo). O socket de chat só
 * existe dentro da conversa, então sem isto o badge nunca acendia. Push e encerramento
 * também invalidam esta chave (prefixo KEY_CHATS).
 */
export const SUPPORT_UNREAD_POLL_MS = 60_000;

export function supportUnreadKey(chatId: string | undefined, userId: string | undefined) {
    return [KEY_CHATS, chatId ?? '', 'unread', userId ?? ''] as const;
}

export function useSupportUnreadCount(): number {
    const { userAuth } = useAuthCredentialsService();
    const userId = userAuth?.id;
    const { activeChat } = useFindActiveChatByUser(userId);
    const chatId = activeChat?.id;

    const { data } = useQuery({
        queryKey: supportUnreadKey(chatId, userId),
        queryFn: () => getUnreadCountService(chatId as string, userId as string),
        enabled: !!chatId && !!userId,
        retry: false,
        staleTime: 0,
        refetchInterval: SUPPORT_UNREAD_POLL_MS,
    });

    return data?.result?.unreadCount ?? 0;
}
