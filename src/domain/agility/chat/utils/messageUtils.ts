import type { ChatMessage } from '../dto/types';

/**
 * Deduplicate messages by ID
 * Filters out messages that already exist in the existing array
 */
export function deduplicateMessages(
    existing: ChatMessage[],
    incoming: ChatMessage[]
): ChatMessage[] {
    const existingIds = new Set(existing.map((m) => m.id));
    return incoming.filter((msg) => !existingIds.has(msg.id));
}

/**
 * Merge two arrays of messages and sort by createdAt
 * Ensures no duplicates in the result (including within existing array)
 */
export function mergeAndSortMessages(
    existing: ChatMessage[],
    incoming: ChatMessage[]
): ChatMessage[] {
    const messageMap = new Map<string, ChatMessage>();

    for (const msg of existing) {
        const existingMsg = messageMap.get(msg.id);
        if (!existingMsg || (!isOptimisticMessage(msg) && isOptimisticMessage(existingMsg))) {
            messageMap.set(msg.id, msg);
        }
    }

    for (const msg of incoming) {
        const existingMsg = messageMap.get(msg.id);
        if (!existingMsg || (!isOptimisticMessage(msg) && isOptimisticMessage(existingMsg))) {
            messageMap.set(msg.id, msg);
        }
    }

    return Array.from(messageMap.values()).sort(
        (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
}

/**
 * Check if a message is an optimistic (temporary) message
 * Optimistic messages have IDs starting with 'temp-'
 */
export function isOptimisticMessage(message: ChatMessage): boolean {
    return message.id.startsWith('temp-');
}

/**
 * Generate a temporary ID for optimistic messages
 */
export function generateTempId(): string {
    return `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Replace an optimistic message with the real one from the server
 */
export function replaceOptimisticMessage(
    messages: ChatMessage[],
    tempId: string,
    realMessage: ChatMessage
): ChatMessage[] {
    return messages.map((msg) => (msg.id === tempId ? realMessage : msg));
}

/**
 * Remove an optimistic message from the array
 */
export function removeOptimisticMessage(
    messages: ChatMessage[],
    tempId: string
): ChatMessage[] {
    return messages.filter((msg) => msg.id !== tempId);
}

/**
 * Get messages that are not from the current user
 * Useful for counting unread messages
 */
export function getMessagesNotFromSender(
    messages: ChatMessage[],
    senderId: string
): ChatMessage[] {
    return messages.filter((msg) => msg.senderId !== senderId);
}

/**
 * Count unread messages (messages not from sender and not marked as read)
 */
export function countUnreadMessages(
    messages: ChatMessage[],
    currentUserId: string
): number {
    return messages.filter(
        (msg) => msg.senderId !== currentUserId && !msg.readAt
    ).length;
}

/**
 * Format message date for display
 */
export function formatMessageDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const hoje = new Date();
    const ontem = new Date(hoje);
    ontem.setDate(ontem.getDate() - 1);

    if (d.toDateString() === hoje.toDateString()) return 'Hoje';
    if (d.toDateString() === ontem.toDateString()) return 'Ontem';

    return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

/**
 * Format message time for display
 */
export function formatMessageTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
