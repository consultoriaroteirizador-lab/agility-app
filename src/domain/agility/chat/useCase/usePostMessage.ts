import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { BaseResponse } from '@/api/baseResponse';
import type { Id } from '@/types/base';

import { postMessageService } from '../chatService';
import type { AttachmentType, ChatMessage, MessageItem, SendMessagePayload } from '../dto/types';
import { MessageStatus, ParticipantType } from '../dto/types';
import { useChatStore } from '../store/useChatStore';
import { generateTempId, toChatMessage, withDisplayableAttachment } from '../utils/messageUtils';

import { chatMessagesKey, upsertMessagesInCache } from './messagesCache';

export interface PostMessagePayload {
    chatId: Id;
    content: string;
    attachmentUrl?: string;
    attachmentType?: string;
    /** keycloakUserId do motorista. Continua no corpo (contrato C1: o backend ignora, mas aceita). */
    senderId?: string;
    /** ID of the message being replied to */
    replyToId?: string;
    /** Bolha otimista já criada pela tela (anexo com URI local). NUNCA vai para a API. */
    tempId?: string;
}

interface MutationContext {
    optimisticMessage: ChatMessage | null;
}

export function usePostMessage(senderType: string = 'DRIVER') {
    const queryClient = useQueryClient();

    return useMutation<BaseResponse<MessageItem>, Error, PostMessagePayload, MutationContext>({
        mutationFn: (payload) => {
            // O backend recusa campo desconhecido (forbidNonWhitelisted): o tempId não pode ir.
            const body = { ...payload };
            delete body.tempId;
            return postMessageService(body as unknown as SendMessagePayload, senderType);
        },

        onMutate: async (payload) => {
            const chatId = String(payload.chatId);
            await queryClient.cancelQueries({ queryKey: chatMessagesKey(chatId) });

            if (payload.tempId) {
                const existing =
                    useChatStore.getState().optimisticMessages[chatId]?.find((m) => m.id === payload.tempId) ?? null;
                return { optimisticMessage: existing };
            }

            const optimisticMessage: ChatMessage = {
                id: generateTempId(),
                chatId,
                senderId: payload.senderId || '',
                senderType: senderType === 'DRIVER' ? ParticipantType.DRIVER : ParticipantType.SUPPORT,
                content: payload.content,
                attachmentUrl: payload.attachmentUrl,
                attachmentType: payload.attachmentType as AttachmentType | undefined,
                status: MessageStatus.SENT,
                createdAt: new Date().toISOString(),
            };
            useChatStore.getState().addOptimisticMessage(chatId, optimisticMessage);
            return { optimisticMessage };
        },

        onSuccess: (data, variables, context) => {
            const chatId = String(variables.chatId);
            const raw = data?.result;
            if (raw?.id) {
                // A mensagem real entra no cache ANTES de a bolha sair: nada pisca nem
                // some, com ou sem socket.
                const server = withDisplayableAttachment(
                    toChatMessage(raw, chatId),
                    context?.optimisticMessage?.attachmentUrl,
                );
                upsertMessagesInCache(queryClient, chatId, [server]);
            } else {
                queryClient.invalidateQueries({ queryKey: chatMessagesKey(chatId) });
            }
            if (context?.optimisticMessage) {
                useChatStore.getState().removeOptimisticMessage(chatId, context.optimisticMessage.id);
            }
        },

        onError: (_error, variables, context) => {
            if (context?.optimisticMessage) {
                useChatStore
                    .getState()
                    .removeOptimisticMessage(String(variables.chatId), context.optimisticMessage.id);
            }
        },
    });
}
