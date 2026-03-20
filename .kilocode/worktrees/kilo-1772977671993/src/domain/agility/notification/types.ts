export type NotificationType = 'ROUTE_UPDATE' | 'SERVICE_ALERT' | 'SYSTEM_MESSAGE';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  status: 'UNREAD' | 'READ';
  createdAt: string;
  readAt?: string;
  metadata?: Record<string, any>;
}
