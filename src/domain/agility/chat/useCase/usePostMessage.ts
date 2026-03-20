import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { BaseResponse } from '@/api/baseResponse';
import { KEY_CHATS } from '@/domain/queryKeys';
import type { Id } from '@/types/base';

import type { MessageItem } from '../chatAPI';
import { postMessageService } from '../chatService';
import type { ChatMessage, AttachmentType } from '../dto/types';
import { MessageStatus, ParticipantType } from '../dto/types';
import { useChatStore } from '../store/useChatStore';
import { generateTempId } from '../utils/messageUtils';

export interface PostMessagePayload {
    chatId: Id;
    content: string;
    attachmentUrl?: string;
    attachmentType?: string;
    senderId?: string;
    /** ID of the message being replied to */
    replyToId?: string;
}

interface MutationContext {
    optimisticMessage: ChatMessage;
}

export function usePostMessage(senderType: string = 'DRIVER') {
    const queryClient = useQueryClient();
    const { addOptimisticMessage, removeOptimisticMessage } =
        useChatStore();

    return useMutation({
        mutationFn: (payload: PostMessagePayload) =>
            postMessageService(
                payload as unknown as Record<string, unknown>,
                senderType
            ),

        onMutate: async (payload): Promise<MutationContext> => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({
                queryKey: [KEY_CHATS, payload.chatId, 'messages'],
            });

            // Create optimistic message
            const tempId = generateTempId();
            const optimisticMessage: ChatMessage = {
                id: tempId,
                chatId: String(payload.chatId),
                senderId: payload.senderId || '',
                senderType:
                    senderType === 'DRIVER'
                        ? ParticipantType.DRIVER
                        : ParticipantType.SUPPORT,
                content: payload.content,
                attachmentUrl: payload.attachmentUrl,
                attachmentType: payload.attachmentType as AttachmentType | undefined,
                status: MessageStatus.SENT,
                createdAt: new Date().toISOString(),
            };

            // Add optimistic message to store
            addOptimisticMessage(String(payload.chatId), optimisticMessage);

            return { optimisticMessage };
        },

        onSuccess: (data: BaseResponse<MessageItem>, variables, context) => {
            // ✅ UX: Não fazer NADA aqui!
            //
            // A mensagem otimística está no Zustand store, NÃO no React Query cache.
            // Quando o WebSocket entregar a mensagem real, o getMergedMessages fará:
            // 1. Verificar que a mensagem real chegou (tem ID real)
            // 2. Filtrar a mensagem otimística (que ainda tem temp-xxx)
            // 3. Mostrar apenas a mensagem real
            //
            // Isso garante que a mensagem nunca desapareça da tela!

            console.log('[usePostMessage] Mensagem confirmada:', {
                tempId: context?.optimisticMessage?.id,
                realId: data?.result?.id,
            });
        },

        onError: (error, variables, context) => {
            console.error('[usePostMessage] Error sending message:', error);

            // Remove optimistic message on error
            if (context?.optimisticMessage) {
                removeOptimisticMessage(
                    String(variables.chatId),
                    context.optimisticMessage.id
                );
            }
        },
    });
}
