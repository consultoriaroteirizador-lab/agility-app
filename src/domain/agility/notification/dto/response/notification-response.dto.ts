export enum NotificationType {
    ROUTE_REPLANNED = 'ROUTE_REPLANNED',
    SERVICE_REMOVED = 'SERVICE_REMOVED',
    SERVICE_ADDED = 'SERVICE_ADDED',
    ROUTE_OFFER = 'ROUTE_OFFER',
    ROUTE_STARTED = 'ROUTE_STARTED',
    ROUTE_COMPLETED = 'ROUTE_COMPLETED',
    SERVICE_COMPLETED = 'SERVICE_COMPLETED',
    PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
    SYSTEM_ALERT = 'SYSTEM_ALERT',
}

export enum NotificationStatus {
    UNREAD = 'UNREAD',
    READ = 'READ',
}

export enum UserType {
    DRIVER = 'DRIVER',
    COLLABORATOR = 'COLLABORATOR',
    CUSTOMER = 'CUSTOMER',
}

export interface NotificationResponse {
    id: string;
    companyId: string;
    userId: string;
    userType: UserType;
    title: string;
    description: string;
    type: NotificationType;
    status: NotificationStatus;
    linkUrl?: string;
    linkLabel?: string;
    referenceId?: string; // ID de referência (ex: routeId, offerId)
    metadata?: Record<string, any>;
    readAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface UnreadCountResponse {
    unreadCount: number;
}