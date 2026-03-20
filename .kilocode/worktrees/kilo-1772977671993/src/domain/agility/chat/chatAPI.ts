import { apiAgility } from '@/api/apiConfig'
import type { BaseResponse } from '@/api/baseResponse'
import type { Id } from '@/types/base'

export type ChatItem = { id: Id } & Record<string, unknown>
export type MessageItem = { id: Id } & Record<string, unknown>

export async function create(payload: Record<string, unknown>): Promise<BaseResponse<ChatItem>> {
  const { data } = await apiAgility.post<BaseResponse<ChatItem>>('/chats', payload)
  return data
}

export async function findOne(id: Id): Promise<BaseResponse<ChatItem>> {
  const { data } = await apiAgility.get<BaseResponse<ChatItem>>(`/chats/${id}`)
  return data
}

export async function findByUser(userId: Id, userType: string = 'DRIVER'): Promise<BaseResponse<ChatItem[]>> {
  const { data } = await apiAgility.get<BaseResponse<ChatItem[]>>(`/chats/user/${userId}`, { params: { userType } })
  return data
}

export async function getMessages(chatId: Id): Promise<BaseResponse<MessageItem[]>> {
  const { data } = await apiAgility.get<BaseResponse<MessageItem[]>>(`/chats/${chatId}/messages`)
  return data
}

export async function sendMessage(payload: Record<string, unknown>, senderType: string = 'DRIVER'): Promise<BaseResponse<MessageItem>> {
  const { data } = await apiAgility.post<BaseResponse<MessageItem>>('/chats/message', payload, { params: { senderType } })
  return data
}

export async function close(id: Id): Promise<BaseResponse<ChatItem>> {
  const { data } = await apiAgility.patch<BaseResponse<ChatItem>>(`/chats/${id}/close`)
  return data
}

export async function markRead(chatId: Id, userId: Id): Promise<BaseResponse<{ success: boolean }>> {
  const { data } = await apiAgility.patch<BaseResponse<{ success: boolean }>>(`/chats/${chatId}/read/${userId}`)
  return data
}

export async function markDelivered(): Promise<BaseResponse<{ success: boolean }>> {
  const { data } = await apiAgility.patch<BaseResponse<{ success: boolean }>>(`/chats/messages/delivered`)
  return data
}

export async function unreadCount(chatId: Id, userId: Id): Promise<BaseResponse<{ count: number }>> {
  const { data } = await apiAgility.get<BaseResponse<{ count: number }>>(`/chats/${chatId}/unread/${userId}`)
  return data
}

export async function createDriverSupport(params: { driverId?: string; supportId?: string }): Promise<BaseResponse<ChatItem>> {
  const queryParams = new URLSearchParams()
  if (params.driverId) queryParams.append('driverId', params.driverId)
  if (params.supportId) queryParams.append('supportId', params.supportId)
  const queryString = queryParams.toString()
  const url = `/chats/driver-support${queryString ? `?${queryString}` : ''}`
  const { data } = await apiAgility.post<BaseResponse<ChatItem>>(url, {})
  return data
}

export async function createDriverCustomer(params: { driverId: string; customerId: string; referenceId?: string }): Promise<BaseResponse<ChatItem>> {
  const queryParams = new URLSearchParams()
  queryParams.append('driverId', params.driverId)
  queryParams.append('customerId', params.customerId)
  if (params.referenceId) queryParams.append('referenceId', params.referenceId)
  const url = `/chats/driver-customer?${queryParams.toString()}`
  const { data } = await apiAgility.post<BaseResponse<ChatItem>>(url, {})
  return data
}

export async function createCustomerSupport(params: { customerId: string; supportId?: string }): Promise<BaseResponse<ChatItem>> {
  const queryParams = new URLSearchParams()
  queryParams.append('customerId', params.customerId)
  if (params.supportId) queryParams.append('supportId', params.supportId)
  const url = `/chats/customer-support?${queryParams.toString()}`
  const { data } = await apiAgility.post<BaseResponse<ChatItem>>(url, {})
  return data
}

/** Upload chat attachment (image or file). Returns public URL(s) to use in send_message. */
export async function uploadChatAttachment(formData: FormData): Promise<BaseResponse<{ urls: string[] }>> {
  const { data } = await apiAgility.post<BaseResponse<{ urls: string[]; count?: number }>>('/chats/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return data
}