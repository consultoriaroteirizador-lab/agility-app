import type { BaseResponse } from '@/api/baseResponse'
import type { Id } from '@/types/base'

import { create, findOne, findByUser, findActiveByUser, getMessages, sendMessage, close, markRead, markDelivered, unreadCount, createDriverSupport, createDriverCustomer, createCustomerSupport, uploadChatAttachment } from './chatAPI'
import type { ChatItem, MessageItem, SendMessagePayload } from './dto/types'

export async function createChatService(payload: Record<string, unknown>): Promise<BaseResponse<ChatItem>> { return create(payload) }
export async function getChatService(id: Id): Promise<BaseResponse<ChatItem>> { return findOne(id) }
export async function listChatsByUserService(userId: Id, userType: string = 'DRIVER'): Promise<BaseResponse<ChatItem[]>> { return findByUser(userId, userType) }
export async function getActiveChatByUserService(userId: Id, userType: string = 'DRIVER'): Promise<BaseResponse<ChatItem | null>> { return findActiveByUser(userId, userType) }
export async function getChatMessagesService(chatId: Id): Promise<BaseResponse<MessageItem[]>> { return getMessages(chatId) }
export async function postMessageService(payload: SendMessagePayload, senderType: string = 'DRIVER'): Promise<BaseResponse<MessageItem>> { return sendMessage(payload, senderType) }
export async function closeChatService(id: Id): Promise<BaseResponse<ChatItem>> { return close(id) }
export async function markChatReadService(chatId: Id, userId: Id): Promise<BaseResponse<{ success: boolean }>> { return markRead(chatId, userId) }
export async function markMessagesDeliveredService(): Promise<BaseResponse<{ success: boolean }>> { return markDelivered() }
export async function getUnreadCountService(chatId: Id, userId: Id): Promise<BaseResponse<{ count: number }>> { return unreadCount(chatId, userId) }
export async function createDriverSupportChatService(params: { driverId?: string; supportId?: string; subject?: string; serviceId?: string }): Promise<BaseResponse<ChatItem>> { return createDriverSupport(params) }
export async function createDriverCustomerChatService(params: { driverId: string; customerId: string; referenceId?: string }): Promise<BaseResponse<ChatItem>> { return createDriverCustomer(params) }
export async function createCustomerSupportChatService(params: { customerId: string; supportId?: string }): Promise<BaseResponse<ChatItem>> { return createCustomerSupport(params) }

export async function uploadChatAttachmentService(files: File[]): Promise<BaseResponse<{ urls: string[] }>> {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    return uploadChatAttachment(formData);
}

export type { ChatItem, MessageItem }
