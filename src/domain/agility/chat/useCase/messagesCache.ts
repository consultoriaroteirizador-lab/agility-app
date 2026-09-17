import type { QueryClient } from '@tanstack/react-query';

import type { BaseResponse } from '@/api/baseResponse';
import { KEY_CHATS } from '@/domain/queryKeys';

import type { ChatMessage, MessageItem } from '../dto/types';
import { upsertServerMessages } from '../utils/messageUtils';

/** Chave única das mensagens de um chat (a mesma usada por `useGetChatMessages`). */
export function chatMessagesKey(chatId: string) {
    return [KEY_CHATS, chatId, 'messages'] as const;
}

/**
 * Grava mensagens do servidor no cache da conversa. Todas as fontes passam por aqui
 * (resposta do REST e `chat_history` do socket): o cache é a fonte única do que o
 * servidor já confirmou.
 */
export function upsertMessagesInCache(queryClient: QueryClient, chatId: string, incoming: ChatMessage[]): void {
    queryClient.setQueryData<BaseResponse<MessageItem[]>>(chatMessagesKey(chatId), (old) => ({
        ...(old ?? { success: true }),
        result: upsertServerMessages((old?.result ?? []) as ChatMessage[], incoming) as MessageItem[],
    }));
}
