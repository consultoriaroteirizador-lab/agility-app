import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { BaseResponse } from '@/api/baseResponse'
import { KEY_CHATS } from '@/domain/queryKeys'
import type { Id } from '@/types/base'

import type { MessageItem } from '../chatAPI'
import { postMessageService } from '../chatService'


export interface PostMessagePayload {
    chatId: Id
    content: string
    attachmentUrl?: string
    attachmentType?: string
}

export function usePostMessage(senderType: string = 'DRIVER') {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (payload: PostMessagePayload) => postMessageService(payload as unknown as Record<string, unknown>, senderType),
        onSuccess: (data: BaseResponse<MessageItem>, variables) => {
            // Invalidar queries relacionadas
            queryClient.invalidateQueries({ queryKey: [KEY_CHATS, variables.chatId, 'messages'] })
            queryClient.invalidateQueries({ queryKey: [KEY_CHATS] })
        },
    })
}
