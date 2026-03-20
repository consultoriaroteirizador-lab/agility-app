import { create } from 'zustand';

import type { ChatMessage } from '../dto/types';

/**
 * Chat state interface for Zustand store
 */
interface ChatState {
    // Unread counters
    unreadCount: number;
    unreadByChat: Record<string, number>;

    // Typing users by chat
    typingUsers: Record<string, string[]>;

    // Connection status
    isConnected: boolean;

    // Messages by chat (for optimistic updates)
    optimisticMessages: Record<string, ChatMessage[]>;

    // Actions - Unread
    incrementUnread: (chatId: string) => void;
    clearUnread: (chatId: string) => void;
    setUnreadCount: (chatId: string, count: number) => void;
    resetUnread: () => void;

    // Actions - Typing
    addTypingUser: (chatId: string, userId: string) => void;
    removeTypingUser: (chatId: string, userId: string) => void;
    clearTypingUsers: (chatId: string) => void;

    // Actions - Connection
    setConnected: (connected: boolean) => void;

    // Actions - Optimistic messages
    addOptimisticMessage: (chatId: string, message: ChatMessage) => void;
    updateOptimisticMessage: (
        chatId: string,
        tempId: string,
        realMessage: ChatMessage
    ) => void;
    removeOptimisticMessage: (chatId: string, tempId: string) => void;
    clearOptimisticMessages: (chatId: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
    // Initial state
    unreadCount: 0,
    unreadByChat: {},
    typingUsers: {},
    isConnected: false,
    optimisticMessages: {},

    // Unread actions
    incrementUnread: (chatId) =>
        set((state) => ({
            unreadCount: state.unreadCount + 1,
            unreadByChat: {
                ...state.unreadByChat,
                [chatId]: (state.unreadByChat[chatId] || 0) + 1,
            },
        })),

    clearUnread: (chatId) =>
        set((state) => ({
            unreadCount: Math.max(
                0,
                state.unreadCount - (state.unreadByChat[chatId] || 0)
            ),
            unreadByChat: {
                ...state.unreadByChat,
                [chatId]: 0,
            },
        })),

    setUnreadCount: (chatId, count) =>
        set((state) => {
            const previousCount = state.unreadByChat[chatId] || 0;
            return {
                unreadCount: state.unreadCount - previousCount + count,
                unreadByChat: {
                    ...state.unreadByChat,
                    [chatId]: count,
                },
            };
        }),

    resetUnread: () =>
        set({
            unreadCount: 0,
            unreadByChat: {},
        }),

    // Typing actions
    addTypingUser: (chatId, userId) =>
        set((state) => {
            const currentUsers = state.typingUsers[chatId] || [];
            if (currentUsers.includes(userId)) {
                return state;
            }
            return {
                typingUsers: {
                    ...state.typingUsers,
                    [chatId]: [...currentUsers, userId],
                },
            };
        }),

    removeTypingUser: (chatId, userId) =>
        set((state) => {
            const currentUsers = state.typingUsers[chatId] || [];
            return {
                typingUsers: {
                    ...state.typingUsers,
                    [chatId]: currentUsers.filter((id) => id !== userId),
                },
            };
        }),

    clearTypingUsers: (chatId) =>
        set((state) => ({
            typingUsers: {
                ...state.typingUsers,
                [chatId]: [],
            },
        })),

    // Connection actions
    setConnected: (connected) => set({ isConnected: connected }),

    // Optimistic message actions
    addOptimisticMessage: (chatId, message) =>
        set((state) => ({
            optimisticMessages: {
                ...state.optimisticMessages,
                [chatId]: [...(state.optimisticMessages[chatId] || []), message],
            },
        })),

    updateOptimisticMessage: (chatId, tempId, realMessage) =>
        set((state) => {
            const messages = state.optimisticMessages[chatId] || [];
            return {
                optimisticMessages: {
                    ...state.optimisticMessages,
                    [chatId]: messages.map((msg) =>
                        msg.id === tempId ? realMessage : msg
                    ),
                },
            };
        }),

    removeOptimisticMessage: (chatId, tempId) =>
        set((state) => {
            const messages = state.optimisticMessages[chatId] || [];
            return {
                optimisticMessages: {
                    ...state.optimisticMessages,
                    [chatId]: messages.filter((msg) => msg.id !== tempId),
                },
            };
        }),

    clearOptimisticMessages: (chatId) =>
        set((state) => ({
            optimisticMessages: {
                ...state.optimisticMessages,
                [chatId]: [],
            },
        })),
}));
