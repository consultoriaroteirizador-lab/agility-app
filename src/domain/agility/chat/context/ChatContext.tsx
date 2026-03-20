import React, { createContext, useContext, useCallback } from 'react';

import type { ChatMessage } from '../dto/types';
import { MessageStatus } from '../dto/types';
import { useChatStore } from '../store/useChatStore';
import {
    mergeAndSortMessages,
    generateTempId,
    isOptimisticMessage,
} from '../utils/messageUtils';

/**
 * Chat context value interface
 */
interface ChatContextValue {
    // Connection status
    isConnected: boolean;

    // Typing users by chat
    typingUsers: Record<string, string[]>;

    // Unread counters
    unreadCount: number;
    unreadByChat: Record<string, number>;

    // Optimistic messages by chat
    optimisticMessages: Record<string, ChatMessage[]>;

    // Actions
    addOptimisticMessage: (chatId: string, message: ChatMessage) => void;
    updateOptimisticMessage: (
        chatId: string,
        tempId: string,
        realMessage: ChatMessage
    ) => void;
    removeOptimisticMessage: (chatId: string, tempId: string) => void;

    // Typing actions
    addTypingUser: (chatId: string, userId: string) => void;
    removeTypingUser: (chatId: string, userId: string) => void;

    // Unread actions
    incrementUnread: (chatId: string) => void;
    clearUnread: (chatId: string) => void;
    setUnreadCount: (chatId: string, count: number) => void;

    // Connection actions
    setConnected: (connected: boolean) => void;

    // Helper to merge messages with optimistic ones
    getMergedMessages: (
        chatId: string,
        serverMessages: ChatMessage[]
    ) => ChatMessage[];
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

/**
 * Chat Provider component
 * Wraps the app to provide chat state and actions
 */
export function ChatProvider({ children }: { children: React.ReactNode }) {
    const {
        isConnected,
        typingUsers,
        unreadCount,
        unreadByChat,
        optimisticMessages,
        addOptimisticMessage: storeAddOptimistic,
        updateOptimisticMessage: storeUpdateOptimistic,
        removeOptimisticMessage: storeRemoveOptimistic,
        addTypingUser,
        removeTypingUser,
        incrementUnread,
        clearUnread,
        setUnreadCount,
        setConnected,
    } = useChatStore();

    // Add optimistic message - uses existing temp ID if provided, otherwise generates one
    const addOptimisticMessage = useCallback(
        (chatId: string, message: ChatMessage) => {
            // Use existing ID if it's already a temp ID, otherwise generate one
            const tempId = message.id && isOptimisticMessage(message)
                ? message.id
                : generateTempId();
            const optimisticMessage: ChatMessage = {
                ...message,
                id: tempId,
                status: MessageStatus.SENT,
                createdAt: message.createdAt || new Date().toISOString(),
            };
            storeAddOptimistic(chatId, optimisticMessage);
        },
        [storeAddOptimistic]
    );

    // Update optimistic message with real data from server
    const updateOptimisticMessage = useCallback(
        (chatId: string, tempId: string, realMessage: ChatMessage) => {
            storeUpdateOptimistic(chatId, tempId, realMessage);
        },
        [storeUpdateOptimistic]
    );

    // Remove optimistic message (on error)
    const removeOptimisticMessage = useCallback(
        (chatId: string, tempId: string) => {
            storeRemoveOptimistic(chatId, tempId);
        },
        [storeRemoveOptimistic]
    );

    // Merge server messages with optimistic messages
    const getMergedMessages = useCallback(
        (chatId: string, serverMessages: ChatMessage[]): ChatMessage[] => {
            const optimistic = optimisticMessages[chatId] || [];

            // ✅ CORREÇÃO: Comparar por conteúdo + remetente + timestamp (não por ID)
            // IDs otimísticos (temp-xxx) nunca vão bater com UUIDs do servidor
            const isConfirmedByServer = (optimisticMsg: ChatMessage): boolean => {
                return serverMessages.some(serverMsg => {
                    // Mesmo conteúdo
                    const sameContent = serverMsg.content === optimisticMsg.content;
                    // Mesmo remetente
                    const sameSender = String(serverMsg.senderId) === String(optimisticMsg.senderId);
                    // Timestamp dentro de 10 segundos (para lidar com diferenças de relógio)
                    const timeDiff = Math.abs(
                        new Date(serverMsg.createdAt).getTime() -
                        new Date(optimisticMsg.createdAt).getTime()
                    );
                    const closeTime = timeDiff < 10000; // 10 segundos

                    return sameContent && sameSender && closeTime;
                });
            };

            // Keep only unconfirmed optimistic messages
            const pendingOptimistic = optimistic.filter(msg => !isConfirmedByServer(msg));

            return mergeAndSortMessages(serverMessages, pendingOptimistic);
        },
        [optimisticMessages]
    );

    const value: ChatContextValue = {
        isConnected,
        typingUsers,
        unreadCount,
        unreadByChat,
        optimisticMessages,
        addOptimisticMessage,
        updateOptimisticMessage,
        removeOptimisticMessage,
        addTypingUser,
        removeTypingUser,
        incrementUnread,
        clearUnread,
        setUnreadCount,
        setConnected,
        getMergedMessages,
    };

    return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

/**
 * Hook to access chat context
 * Must be used within a ChatProvider
 */
export function useChatContext(): ChatContextValue {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error('useChatContext must be used within a ChatProvider');
    }
    return context;
}

/**
 * Hook to get typing users for a specific chat
 */
export function useTypingUsers(chatId: string | undefined): string[] {
    const { typingUsers } = useChatContext();
    if (!chatId) return [];
    return typingUsers[chatId] || [];
}

/**
 * Hook to get unread count for a specific chat
 */
export function useChatUnreadCount(chatId: string | undefined): number {
    const { unreadByChat } = useChatContext();
    if (!chatId) return 0;
    return unreadByChat[chatId] || 0;
}

/**
 * Hook to get total unread count
 */
export function useTotalUnreadCount(): number {
    const { unreadCount } = useChatContext();
    return unreadCount;
}
