import type { BaseResponse } from '@/api';

import type { NotificationResponse, UnreadCountResponse } from './dto';
import {
    findAll,
    findUnreadList,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    remove,
} from './notificationAPI';

export async function listNotificationsService(
    limit?: number,
    offset?: number
): Promise<BaseResponse<NotificationResponse[]>> {
    return findAll(limit, offset);
}

export async function listUnreadNotificationsService(
    limit?: number,
    offset?: number
): Promise<BaseResponse<NotificationResponse[]>> {
    return findUnreadList(limit, offset);
}

export async function getUnreadCountService(): Promise<BaseResponse<UnreadCountResponse>> {
    return getUnreadCount();
}

export async function markNotificationAsReadService(id: string): Promise<BaseResponse<NotificationResponse>> {
    return markAsRead(id);
}

export async function markAllNotificationsAsReadService(): Promise<BaseResponse<{ message: string }>> {
    return markAllAsRead();
}

export async function removeNotificationService(id: string): Promise<BaseResponse<void>> {
    return remove(id);
}

export type { NotificationResponse, UnreadCountResponse };