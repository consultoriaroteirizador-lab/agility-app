import { useEffect, useRef, useCallback, useState } from 'react';

import type { Socket } from 'socket.io-client';

import { useAuthCredentialsService } from '@/services';
import { createAuthedSocket, socketBaseUrl, type AuthedSocket } from '@/services/socket/createAuthedSocket';

import type { ChatMessage } from '../dto/types';
import { useChatStore } from '../store/useChatStore';

export interface UseChatWebSocketOptions {
    enabled?: boolean;
    chatId?: string;
    onMessage?: (message: ChatMessage) => void;
    onChatClosed?: (chatId: string) => void;
    onError?: (error: Error) => void;
    onTypingStart?: (data: { chatId: string; userId: string }) => void;
    onTypingStop?: (data: { chatId: string; userId: string }) => void;
    onMessagesRead?: (data: { chatId: string; readBy: string; messageId?: string }) => void;
    onMessagesDelivered?: (data: { chatId: string; messageIds: string[]; deliveredTo: string; deliveredAt: string }) => void;
    /** Histórico recente que o servidor manda a cada `join_chat` (inclusive depois de reconectar). */
    onHistory?: (data: { chatId: string; messages: ChatMessage[] }) => void;
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
        onMessagesRead,
        onMessagesDelivered,
        onHistory,
    } = options;
    const { authCredentials, userAuth } = useAuthCredentialsService();
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);
    const authedRef = useRef<AuthedSocket | null>(null);
    // Chat aberto na tela: a reconexão re-emite `join_chat` para ele (ver `onReady`).
    const chatIdRef = useRef(chatId);
    const joinedChatsRef = useRef<Set<string>>(new Set());
    const isMountedRef = useRef(true);
    const connectingRef = useRef(false);
    const deliveredMessageIdsRef = useRef<Set<string>>(new Set());
    const DELIVERED_IDS_MAX = 100;
    // Token lido a cada tentativa de conexão: o refresh troca `authCredentials` sem recriar o socket.
    const tokenRef = useRef(authCredentials?.accessToken);

    useEffect(() => {
        tokenRef.current = authCredentials?.accessToken;
    }, [authCredentials?.accessToken]);

    useEffect(() => {
        chatIdRef.current = chatId;
    }, [chatId]);

    /** Descarta o socket atual (cancela a retentativa agendada pelo helper). */
    const disposeSocket = useCallback(() => {
        authedRef.current?.dispose();
        authedRef.current = null;
        socketRef.current = null;
    }, []);

    const onMessageRef = useRef(onMessage);
    const onChatClosedRef = useRef(onChatClosed);
    const onErrorRef = useRef(onError);
    const onTypingStartRef = useRef(onTypingStart);
    const onTypingStopRef = useRef(onTypingStop);
    const onMessagesReadRef = useRef(onMessagesRead);
    const onMessagesDeliveredRef = useRef(onMessagesDelivered);
    const onHistoryRef = useRef(onHistory);

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
        onMessagesReadRef.current = onMessagesRead;
        onMessagesDeliveredRef.current = onMessagesDelivered;
        onHistoryRef.current = onHistory;
    }, [onMessage, onChatClosed, onError, onTypingStart, onTypingStop, onMessagesRead, onMessagesDelivered, onHistory]);

    useEffect(() => {
        isMountedRef.current = true;
        const setConnected = setConnectedRef.current;
        return () => {
            isMountedRef.current = false;
            deliveredMessageIdsRef.current.clear();
            if (socketRef.current) {
                console.log('[useChatWebSocket] Component unmounting, disconnecting...');
                disposeSocket();
                setIsConnected(false);
                setConnected(false);
                joinedChatsRef.current.clear();
                connectingRef.current = false;
            }
        };
    }, [disposeSocket]);

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

        // Socket já existe (ex.: reconectando numa queda): reaproveita em vez de abrir um
        // segundo. O `auth` é função, então o próximo handshake já leva o token atual.
        if (socketRef.current) {
            console.log('[useChatWebSocket] connect() - reusing existing socket');
            socketRef.current.connect();
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

        const userId = userAuth?.id || null;
        console.log('[useChatWebSocket] userId from userAuth:', userId);

        if (!userId) {
            console.warn('[useChatWebSocket] Could not extract userId from userAuth');
            connectingRef.current = false;
            return;
        }

        const userType = getUserType();
        console.log('[useChatWebSocket] Creating socket connection:', {
            url: `${socketBaseUrl()}/chat`,
            userId,
            userType,
            tenantId,
        });

        // Token por tentativa, reconexão infinita e `io server disconnect` (token vencido)
        // ficam com o helper. Aqui não há refetch próprio para renovar o token: com o socket
        // fora, a tela do chat liga o polling REST (`CHAT_OFFLINE_POLL_MS`), e é o 401 dele que
        // renova o token antes da próxima tentativa.
        const authed = createAuthedSocket({
            namespace: '/chat',
            // userType 'DRIVER' continua no handshake (contrato C2): o gateway recusa sem ele.
            getAuth: () => ({
                token: tokenRef.current,
                userId,
                userType,
                tenantId,
            }),
            query: {
                userId,
                userType,
                tenantId,
            },
            onReady: () => {
                console.log('[useChatWebSocket] ✅ Server confirmed connection');
                if (!isMountedRef.current || !socketRef.current?.connected) return;
                setIsConnected(true);
                setConnectedRef.current(true);
                // A sala `chat:<id>` é do socket ANTIGO: numa reconexão o servidor não sabe
                // mais do chat aberto. O rejoin sai daqui, e não só do efeito de `isConnected`:
                // se a queda e a volta caem no mesmo lote do React, o estado não muda e o
                // efeito não roda. O `chat_history` que volta do join repõe o que se perdeu.
                const aberto = chatIdRef.current;
                if (aberto && !joinedChatsRef.current.has(aberto)) {
                    socket.emit('join_chat', { chatId: aberto, userId });
                    joinedChatsRef.current.add(aberto);
                }
            },
            onDisconnect: (reason) => {
                console.log('[useChatWebSocket] Disconnected:', reason);
                if (isMountedRef.current) {
                    setIsConnected(false);
                    setConnectedRef.current(false);
                }
                joinedChatsRef.current.clear();
            },
        });
        const socket = authed.socket;

        socket.on('connect', () => {
            console.log('[useChatWebSocket] ✅ Socket connected! Socket ID:', socket.id, '- Aguardando confirmação do servidor...');
            connectingRef.current = false;
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
            console.log('[useChatWebSocket] Chat history received:', data?.chatId, data?.messages?.length, 'messages');
            if (data?.chatId && Array.isArray(data.messages)) {
                onHistoryRef.current?.(data);
            }
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

        // Outro participante (ex.: operador) leu as mensagens deste chat
        socket.on('messages_read', (data: { chatId: string; readBy: string; messageId?: string }) => {
            console.log('[useChatWebSocket] Messages read by peer:', data);
            if (onMessagesReadRef.current) {
                onMessagesReadRef.current(data);
            }
        });

        // Mensagens foram entregues a outro participante
        socket.on('messages_delivered', (data: { chatId: string; messageIds: string[]; deliveredTo: string; deliveredAt: string }) => {
            console.log('[useChatWebSocket] Messages delivered:', data);
            if (onMessagesDeliveredRef.current) {
                onMessagesDeliveredRef.current(data);
            }
        });

        socket.on('error', (error: { message: string }) => {
            console.error('[useChatWebSocket] Error:', error);
            if (onErrorRef.current) {
                onErrorRef.current(new Error(error.message));
            }
        });

        socket.on('connect_error', (error) => {
            console.error('[useChatWebSocket] Connection error:', error);
            connectingRef.current = false;
            if (onErrorRef.current) {
                onErrorRef.current(error);
            }
        });

        socketRef.current = socket;
        authedRef.current = authed;
    }, [enabled, authCredentials, userAuth, getUserType]);

    const disconnect = useCallback(() => {
        if (socketRef.current) {
            console.log('[useChatWebSocket] Disconnecting...');
            connectingRef.current = false;
            disposeSocket();
            if (isMountedRef.current) {
                setIsConnected(false);
                setConnectedRef.current(false);
            }
            joinedChatsRef.current.clear();
        }
    }, [disposeSocket]);

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
        console.log('[useChatWebSocket] leaveChat called:', { chatId: chatIdToLeave, userId, hasSocket: !!socketRef.current });

        // Confere o SOCKET, não o estado React: com a conexão caída, o emit iria para o
        // buffer e sairia depois do novo join, tirando o motorista da sala.
        if (!socketRef.current?.connected) {
            console.warn('[useChatWebSocket] Cannot leave chat: not connected');
            return;
        }


        console.log('[useChatWebSocket] Emitting leave_chat for:', chatIdToLeave);
        socketRef.current.emit('leave_chat', { chatId: chatIdToLeave, userId });
        joinedChatsRef.current.delete(chatIdToLeave);
        console.log('[useChatWebSocket] leave_chat emitted successfully');
    }, []);

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
