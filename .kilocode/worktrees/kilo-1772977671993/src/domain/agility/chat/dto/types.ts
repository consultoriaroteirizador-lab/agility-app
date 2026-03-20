/**
 * Chat enums and types
 * Mirrors backend enums
 */

export enum ChatType {
    DRIVER_SUPPORT = 'DRIVER_SUPPORT',
    DRIVER_CUSTOMER = 'DRIVER_CUSTOMER',
    CUSTOMER_SUPPORT = 'CUSTOMER_SUPPORT',
}

export enum ChatStatus {
    ACTIVE = 'ACTIVE',
    CLOSED = 'CLOSED',
    ARCHIVED = 'ARCHIVED',
}

export enum MessageStatus {
    SENT = 'SENT',
    DELIVERED = 'DELIVERED',
    READ = 'READ',
}

export enum ParticipantType {
    DRIVER = 'DRIVER',
    CUSTOMER = 'CUSTOMER',
    SUPPORT = 'SUPPORT',
    COLLABORATOR = 'COLLABORATOR',
}

/**
 * Chat message DTO
 */
export interface ChatMessage {
    id: string;
    chatId: string;
    senderId: string;
    senderType: ParticipantType;
    content: string;
    attachmentUrl?: string;
    attachmentType?: string;
    status: MessageStatus;
    readAt?: string;
    deliveredAt?: string;
    createdAt: string;
    updatedAt?: string;
}

/**
 * Chat participant DTO
 */
export interface ChatParticipant {
    id: string;
    userId: string;
    userType: ParticipantType;
    joinedAt: string;
    leftAt?: string;
    isOnline?: boolean;
}

/**
 * Chat DTO
 */
export interface Chat {
    id: string;
    chatType: ChatType;
    status: ChatStatus;
    subject?: string;
    referenceId?: string;
    referenceType?: string;
    lastMessageAt?: string;
    participants: ChatParticipant[];
    createdAt: string;
    updatedAt: string;
}

