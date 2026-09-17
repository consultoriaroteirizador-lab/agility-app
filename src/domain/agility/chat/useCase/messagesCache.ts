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
 * Mescla mensagens do servidor no cache da conversa, sem apagar as que já estão lá.
 * Passam por aqui a resposta do envio (REST, `usePostMessage`) e o `chat_history` do socket.
 * Nem tudo passa: o GET (`useGetChatMessages`) substitui a lista inteira do cache, e o
 * `new_message` do socket fica no estado local da tela de conversa (`wsMessages` em
 * `menu/suporte/[id].tsx`), não aqui.
 */
export function upsertMessagesInCache(queryClient: QueryClient, chatId: string, incoming: ChatMessage[]): void {
    queryClient.setQueryData<BaseResponse<MessageItem[]>>(chatMessagesKey(chatId), (old) => ({
        ...(old ?? { success: true }),
        result: upsertServerMessages((old?.result ?? []) as ChatMessage[], incoming) as MessageItem[],
    }));
}
