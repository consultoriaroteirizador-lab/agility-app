import { useEffect, useRef, useCallback, useState } from 'react';

import { jwtDecode } from 'jwt-decode';
import { io, Socket } from 'socket.io-client';

import { urls } from '@/config/urls';
import { useAuthCredentialsService } from '@/services';

import type { ChatMessage } from '../dto/types';
import { useChatStore } from '../store/useChatStore';

const getWebSocketUrl = () => {
    const baseUrl = urls.agilityApi;
    const wsBase = baseUrl.replace(/^https?:\/\//, '');
    const protocol = baseUrl.startsWith('https') ? 'wss' : 'ws';
    return `${protocol}://${wsBase}`;
};

export interface UseChatWebSocketOptions {
    enabled?: boolean;
    chatId?: string;
    onMessage?: (message: ChatMessage) => void;
    onChatClosed?: (chatId: string) => void;
    onError?: (error: Error) => void;
    onTypingStart?: (data: { chatId: string; userId: string }) => void;
    onTypingStop?: (data: { chatId: string; userId: string }) => void;
}

export function useChatWebSocket(options: UseChatWebSocketOptions = {}) {
    const {
        enabled = true,
        chatId,
        onMessage,
        onChatClosed,
        onError,
        onTypingStart,
        onTypingStop,
    } = options;
    const { authCredentials, userAuth } = useAuthCredentialsService();
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);
    const joinedChatsRef = useRef<Set<string>>(new Set());
    const isMountedRef = useRef(true);
    const connectingRef = useRef(false);
    const deliveredMessageIdsRef = useRef<Set<string>>(new Set());
    const DELIVERED_IDS_MAX = 100;

    const onMessageRef = useRef(onMessage);
    const onChatClosedRef = useRef(onChatClosed);
    const onErrorRef = useRef(onError);
    const onTypingStartRef = useRef(onTypingStart);
    const onTypingStopRef = useRef(onTypingStop);

    const setConnectedRef = useRef(useChatStore.getState().setConnected);
    const addTypingUserRef = useRef(useChatStore.getState().addTypingUser);
    const removeTypingUserRef = useRef(useChatStore.getState().removeTypingUser);
    const incrementUnreadRef = useRef(useChatStore.getState().incrementUnread);

    useEffect(() => {
        onMessageRef.current = onMessage;
        onChatClosedRef.current = onChatClosed;
        onErrorRef.current = onError;
        onTypingStartRef.current = onTypingStart;
        onTypingStopRef.current = onTypingStop;
    }, [onMessage, onChatClosed, onError, onTypingStart, onTypingStop]);

    useEffect(() => {
        isMountedRef.current = true;
        const setConnected = setConnectedRef.current;
        return () => {
            isMountedRef.current = false;
            deliveredMessageIdsRef.current.clear();
            if (socketRef.current) {
                console.log('[useChatWebSocket] Component unmounting, disconnecting...');
                socketRef.current.disconnect();
                socketRef.current = null;
                setIsConnected(false);
                setConnected(false);
                joinedChatsRef.current.clear();
                connectingRef.current = false;
            }
        };
    }, []);

    const getUserType = useCallback((): string => {
        return 'DRIVER';
    }, []);

    const connect = useCallback(() => {
        console.log('[useChatWebSocket] connect() called:', {
            enabled,
            hasSocket: !!socketRef.current,
            socketConnected: socketRef.current?.connected,
            connectingRef: connectingRef.current,
        });


        if (!enabled || socketRef.current?.connected || connectingRef.current) {
            console.log('[useChatWebSocket] connect() - skipping (already connected/connecting or disabled)');
            return;
        }

        connectingRef.current = true;

        if (!authCredentials?.accessToken) {
            console.warn('[useChatWebSocket] Missing accessToken, cannot connect');
            connectingRef.current = false;
            return;
        }

        const tenantId = authCredentials?.tenantId || null;
        console.log('[useChatWebSocket] tenantId check:', {
            tenantId,
            hasTenantId: !!tenantId,
            authCredentialsTenantId: authCredentials?.tenantId,
        });

        if (!tenantId) {
            console.warn('[useChatWebSocket] Missing tenantId, cannot connect');
            console.warn('[useChatWebSocket] authCredentials:', {
                hasTenantId: !!authCredentials?.tenantId,
                tenantIdValue: authCredentials?.tenantId,
            });
            connectingRef.current = false;
            return;
        }

        let userId: string | null = userAuth?.id || null;
        console.log('[useChatWebSocket] Initial userId:', userId, 'from userAuth?.id');

        try {
            const payload = jwtDecode<any>(authCredentials.accessToken);
            console.log('[useChatWebSocket] JWT payload:', {
                sub: payload.sub,
                userId: payload.userId,
            });
            userId = payload.sub || payload.userId || userAuth?.id || null;
            console.log('[useChatWebSocket] Extracted userId from JWT:', userId);
        } catch (error) {
            console.error('[useChatWebSocket] Failed to decode token:', error);
            if (!userId && userAuth?.id) {
                userId = userAuth.id;
            }
        }

        if (!userId) {
            console.warn('[useChatWebSocket] Could not extract userId');
            connectingRef.current = false;
            return;
        }

        const userType = getUserType();
        const wsUrl = getWebSocketUrl();
        console.log('[useChatWebSocket] Creating socket connection:', {
            url: `${wsUrl}/chat`,
            userId,
            userType,
            tenantId,
        });

        const socket = io(`${wsUrl}/chat`, {
            auth: {
                userId,
                userType,
                tenantId,
            },
            query: {
                userId,
                userType,
                tenantId,
            },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
        });

        socket.on('connect', () => {
            console.log('[useChatWebSocket] ✅ Socket connected! Socket ID:', socket.id, '- Aguardando confirmação do servidor...');
            connectingRef.current = false;
        });

        socket.on('connected', (data) => {
            console.log('[useChatWebSocket] ✅ Server confirmed connection:', data);
            if (isMountedRef.current && socketRef.current?.connected) {
                console.log('[useChatWebSocket] ✅ Connection fully established, setting isConnected=true');
                setIsConnected(true);
                setConnectedRef.current(true);
            }
        });

        const deliverOnce = (message: ChatMessage & { messageId?: string }) => {
            const id = message?.id ?? message?.messageId;
            const fallbackKey = id || [message?.chatId, message?.content, message?.createdAt, message?.senderId].join('|');

            if (deliveredMessageIdsRef.current.has(id || fallbackKey)) {
                console.log('[useChatWebSocket] Skipping duplicate delivery for message:', id || fallbackKey.slice(0, 50));
                return;
            }

            deliveredMessageIdsRef.current.add(id || fallbackKey);

            if (deliveredMessageIdsRef.current.size > DELIVERED_IDS_MAX) {
                const arr = Array.from(deliveredMessageIdsRef.current);
                deliveredMessageIdsRef.current = new Set(arr.slice(-Math.floor(DELIVERED_IDS_MAX / 2)));
            }

            // ✅ CORREÇÃO: Usar senderKeycloakUserId para comparação correta de mensagens próprias
            const isOwnMessage = message.senderKeycloakUserId
                ? message.senderKeycloakUserId === userAuth?.id
                : message.senderId === userAuth?.id;

            if (!isOwnMessage) {
                incrementUnreadRef.current(message.chatId);
            }

            if (onMessageRef.current) {
                onMessageRef.current(message);
            } else {
                console.warn('[useChatWebSocket] No onMessage callback registered');
            }
        };

        socket.on('new_message', (message: ChatMessage) => {
            console.log('[useChatWebSocket] New message received:', {
                chatId: message.chatId,
                messageId: message.id,
                content: message.content?.substring(0, 50),
                senderId: message.senderId,
                senderType: message.senderType,
                createdAt: message.createdAt,
            });
            deliverOnce(message);
        });

        socket.on('chat_history', (data: { chatId: string; messages: ChatMessage[] }) => {
            console.log('[useChatWebSocket] Chat history received:', data.chatId, data.messages.length, 'messages');
        });

        socket.on('notification', (event: { type: string; chatId: string; message?: ChatMessage }) => {
            console.log('[useChatWebSocket] Notification received:', {
                type: event.type,
                chatId: event.chatId,
                hasMessage: !!event.message,
                messageId: event.message?.id,
            });

            if (event.type === 'new_message' && event.message) {
                console.log('[useChatWebSocket] Processing new_message from notification (deliverOnce)');
                deliverOnce(event.message);
            }

            if (event.type === 'chat_closed' && onChatClosedRef.current) {
                console.log('[useChatWebSocket] Processing chat_closed from notification');
                onChatClosedRef.current(event.chatId);
            }
        });

        socket.on('chat_closed', (data: { chatId: string }) => {
            console.log('[useChatWebSocket] Chat closed event received:', data.chatId);
            if (onChatClosedRef.current) {
                onChatClosedRef.current(data.chatId);
            }
        });

        socket.on('typing_start', (data: { chatId: string; userId: string }) => {
            console.log('[useChatWebSocket] Typing start:', data);
            addTypingUserRef.current(data.chatId, data.userId);
            if (onTypingStartRef.current) {
                onTypingStartRef.current(data);
            }
        });

        socket.on('typing_stop', (data: { chatId: string; userId: string }) => {
            console.log('[useChatWebSocket] Typing stop:', data);
            removeTypingUserRef.current(data.chatId, data.userId);
            if (onTypingStopRef.current) {
                onTypingStopRef.current(data);
            }
        });

        socket.on('error', (error: { message: string }) => {
            console.error('[useChatWebSocket] Error:', error);
            if (onErrorRef.current) {
                onErrorRef.current(new Error(error.message));
            }
        });

        socket.on('disconnect', (reason) => {
            console.log('[useChatWebSocket] Disconnected:', reason);
            if (isMountedRef.current) {
                setIsConnected(false);
                setConnectedRef.current(false);
            }
            joinedChatsRef.current.clear();
        });

        socket.on('connect_error', (error) => {
            console.error('[useChatWebSocket] Connection error:', error);
            connectingRef.current = false;
            if (onErrorRef.current) {
                onErrorRef.current(error);
            }
        });

        socketRef.current = socket;
    }, [enabled, authCredentials, userAuth, getUserType]);

    const disconnect = useCallback(() => {
        if (socketRef.current) {
            console.log('[useChatWebSocket] Disconnecting...');
            connectingRef.current = false;
            socketRef.current.disconnect();
            socketRef.current = null;
            if (isMountedRef.current) {
                setIsConnected(false);
                setConnectedRef.current(false);
            }
            joinedChatsRef.current.clear();
        }
    }, []);

    const joinChat = useCallback((chatIdToJoin: string, userId: string) => {
        if (!socketRef.current) {
            console.warn('[useChatWebSocket] Cannot join chat: socket not initialized');
            return;
        }

        if (!isConnected) {
            console.warn('[useChatWebSocket] Cannot join chat: not connected', {
                chatId: chatIdToJoin,
                userId,
                socketConnected: socketRef.current.connected,
            });
            return;
        }

        if (joinedChatsRef.current.has(chatIdToJoin)) {
            console.log('[useChatWebSocket] Already joined chat:', chatIdToJoin);
            return;
        }

        console.log('[useChatWebSocket] Joining chat:', chatIdToJoin, 'userId:', userId, 'socketId:', socketRef.current.id);
        try {
            socketRef.current.emit('join_chat', { chatId: chatIdToJoin, userId });
            joinedChatsRef.current.add(chatIdToJoin);
            console.log('[useChatWebSocket] Join chat event emitted successfully');
        } catch (error) {
            console.error('[useChatWebSocket] Error joining chat:', error);
        }
    }, [isConnected]);

    const leaveChat = useCallback((chatIdToLeave: string, userId: string) => {
        console.log('[useChatWebSocket] leaveChat called:', { chatId: chatIdToLeave, userId, isConnected, hasSocket: !!socketRef.current });

        if (!socketRef.current || !isConnected) {
            console.warn('[useChatWebSocket] Cannot leave chat: not connected');
            return;
        }


        console.log('[useChatWebSocket] Emitting leave_chat for:', chatIdToLeave);
        socketRef.current.emit('leave_chat', { chatId: chatIdToLeave, userId });
        joinedChatsRef.current.delete(chatIdToLeave);
        console.log('[useChatWebSocket] leave_chat emitted successfully');
    }, [isConnected]);

    const sendMessage = useCallback((payload: { chatId: string; content: string }) => {
        if (!socketRef.current || !isConnected) {
            console.warn('[useChatWebSocket] Cannot send message: not connected');
            return;
        }

        console.log('[useChatWebSocket] Sending message via WebSocket:', payload.chatId);
        socketRef.current.emit('send_message', payload);
    }, [isConnected]);

    const markAsRead = useCallback((chatIdToMark: string, messageId: string) => {
        if (!socketRef.current || !isConnected) {
            console.warn('[useChatWebSocket] Cannot mark as read: not connected');
            return;
        }

        console.log('[useChatWebSocket] Marking as read:', chatIdToMark, messageId);
        socketRef.current.emit('mark_read', { chatId: chatIdToMark, messageId });
    }, [isConnected]);

    const emitTypingStart = useCallback((chatIdForTyping: string) => {
        if (!socketRef.current || !isConnected) {
            return;
        }
        socketRef.current.emit('typing_start', { chatId: chatIdForTyping });
    }, [isConnected]);

    const emitTypingStop = useCallback((chatIdForTyping: string) => {
        if (!socketRef.current || !isConnected) {
            return;
        }
        socketRef.current.emit('typing_stop', { chatId: chatIdForTyping });
    }, [isConnected]);

    useEffect(() => {
        const shouldConnect = enabled && !!authCredentials?.accessToken && !!userAuth?.id;

        if (shouldConnect) {
            if (socketRef.current?.connected || connectingRef.current) {
                console.log('[useChatWebSocket] Already connected or connecting, skipping');
                return;
            }

            // Conectar imediatamente sem delay artificial
            if (isMountedRef.current) {
                connect();
            }
        } else {
            disconnect();
        }
    }, [enabled, authCredentials?.accessToken, userAuth?.id, connect, disconnect]);

    useEffect(() => {
        console.log('[useChatWebSocket] join_chat effect triggered:', {
            chatId,
            isConnected,
            hasSocket: !!socketRef.current,
            socketConnected: socketRef.current?.connected,
            userAuthId: userAuth?.id,
        });

        if (!chatId || !isConnected || !socketRef.current || !userAuth?.id) {
            console.log('[useChatWebSocket] join_chat effect - missing requirements, skipping join');
            return;
        }

        const userId = userAuth.id;
        console.log('[useChatWebSocket] Calling joinChat with userId:', userId);
        joinChat(chatId, userId);

        return () => {
            console.log('[useChatWebSocket] join_chat effect cleanup - leaving chat:', chatId);
            leaveChat(chatId, userId);
        };
    }, [chatId, isConnected, userAuth?.id, joinChat, leaveChat]);

    return {
        isConnected,
        connect,
        disconnect,
        joinChat,
        leaveChat,
        sendMessage,
        markAsRead,
        emitTypingStart,
        emitTypingStop,
    };
}
