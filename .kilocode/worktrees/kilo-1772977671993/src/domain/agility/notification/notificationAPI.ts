import { apiAgility } from '@/api/apiConfig'
import type { BaseResponse } from '@/api/baseResponse'

import type { NotificationResponse, UnreadCountResponse } from './dto'

export async function findAll(limit?: number, offset?: number): Promise<BaseResponse<NotificationResponse[]>> {
    const params: Record<string, string | number> = {}
    if (limit !== undefined) params.limit = limit
    if (offset !== undefined) params.offset = offset
    const { data } = await apiAgility.get<BaseResponse<NotificationResponse[]>>('/notifications', { params })
    return data
}

export async function findUnreadList(limit?: number, offset?: number): Promise<BaseResponse<NotificationResponse[]>> {
    const params: Record<string, string | number> = {}
    if (limit !== undefined) params.limit = limit
    if (offset !== undefined) params.offset = offset
    const { data } = await apiAgility.get<BaseResponse<NotificationResponse[]>>('/notifications/unread/list', { params })
    return data
}

export async function getUnreadCount(): Promise<BaseResponse<UnreadCountResponse>> {
    const { data } = await apiAgility.get<BaseResponse<UnreadCountResponse>>('/notifications/unread')
    return data
}

export async function markAsRead(id: string): Promise<BaseResponse<NotificationResponse>> {
    const { data } = await apiAgility.patch<BaseResponse<NotificationResponse>>(`/notifications/${id}/read`)
    return data
}

export async function markAllAsRead(): Promise<BaseResponse<{ message: string }>> {
    const { data } = await apiAgility.patch<BaseResponse<{ message: string }>>('/notifications/read-all')
    return data
}

export async function remove(id: string): Promise<BaseResponse<void>> {
    const { data } = await apiAgility.delete<BaseResponse<void>>(`/notifications/${id}`)
    return data
}