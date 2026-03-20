import { useEffect, useRef, useCallback, useState } from 'react';

import { jwtDecode } from 'jwt-decode';
import { io, Socket } from 'socket.io-client';

import { urls } from '@/config/urls';
import { useAuthCredentialsService } from '@/services';

import type { ChatMessage } from '../dto/types';

const getWebSocketUrl = () => {
    const baseUrl = urls.agilityApi;
    // Remove http:// ou https:// e adiciona ws:// ou wss://
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
}

export function useChatWebSocket(options: UseChatWebSocketOptions = {}) {
    const { enabled = true, chatId, onMessage, onChatClosed, onError } = options;
    const { authCredentials, userAuth } = useAuthCredentialsService();
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);
    const joinedChatsRef = useRef<Set<string>>(new Set());
    const isMountedRef = useRef(true);
    const connectingRef = useRef(false);

    // Usar refs para callbacks para evitar recriação do socket
    const onMessageRef = useRef(onMessage);
    const onChatClosedRef = useRef(onChatClosed);
    const onErrorRef = useRef(onError);

    // Atualizar refs quando callbacks mudarem
    useEffect(() => {
        onMessageRef.current = onMessage;
        onChatClosedRef.current = onChatClosed;
        onErrorRef.current = onError;
    }, [onMessage, onChatClosed, onError]);

    // Marcar componente como montado e desconectar no unmount
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            // Desconectar quando componente desmontar
            if (socketRef.current) {
                console.log('[useChatWebSocket] Component unmounting, disconnecting...');
                socketRef.current.disconnect();
                socketRef.current = null;
                setIsConnected(false);
                joinedChatsRef.current.clear();
                connectingRef.current = false;
            }
        };
    }, []);

    const getUserType = useCallback((): string => {
        // Para o app, sempre é DRIVER
        return 'DRIVER';
    }, []);

    const connect = useCallback(() => {
        if (!enabled || socketRef.current?.connected || connectingRef.current) {
            return;
        }

        connectingRef.current = true;

        if (!authCredentials?.accessToken) {
            console.warn('[useChatWebSocket] Missing accessToken, cannot connect');
            connectingRef.current = false;
            return;
        }

        // Extrai userId do token JWT ou usa userAuth.id
        let userId: string | null = userAuth?.id || null;
        let tenantId: string | null = null;

        try {
            const payload = jwtDecode<any>(authCredentials.accessToken);
            userId = payload.sub || payload.userId || userAuth?.id || null;
            tenantId = payload.tenantId || payload.tenant_id || null;
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
        console.log('[useChatWebSocket] Connecting to:', `${wsUrl}/chat`, { userId, userType, tenantId });

        const socketConfig: any = {
            auth: {
                userId,
                userType,
            },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
        };

        // Adiciona tenantId se disponível
        if (tenantId) {
            socketConfig.auth.tenantId = tenantId;
            socketConfig.query = { userId, userType, tenantId };
        } else {
            socketConfig.query = { userId, userType };
        }

        const socket = io(`${wsUrl}/chat`, socketConfig);

        socket.on('connect', () => {
            console.log('[useChatWebSocket] Connected');
            if (isMountedRef.current) {
                setIsConnected(true);
            }
        });

        socket.on('connected', (data) => {
            console.log('[useChatWebSocket] Connection confirmed:', data);
        });

        // Event: new_message - Nova mensagem recebida
        socket.on('new_message', (message: ChatMessage) => {
            console.log('[useChatWebSocket] New message received:', {
                chatId: message.chatId,
                messageId: message.id,
                content: message.content?.substring(0, 50),
                senderId: message.senderId,
                senderType: message.senderType,
                createdAt: message.createdAt,
            });
            if (onMessageRef.current) {
                onMessageRef.current(message);
            } else {
                console.warn('[useChatWebSocket] No onMessage callback registered');
            }
        });

        // Event: chat_history - Histórico ao entrar no chat
        socket.on('chat_history', (data: { chatId: string; messages: ChatMessage[] }) => {
            console.log('[useChatWebSocket] Chat history received:', data.chatId, data.messages.length, 'messages');
            // As mensagens já são carregadas via REST quando o componente monta
        });

        // Event: notification - Notificações gerais
        socket.on('notification', (event: { type: string; chatId: string; message?: ChatMessage }) => {
            console.log('[useChatWebSocket] Notification received:', {
                type: event.type,
                chatId: event.chatId,
                hasMessage: !!event.message,
            });
            if (event.type === 'new_message' && event.message && onMessageRef.current) {
                console.log('[useChatWebSocket] Processing new_message from notification');
                onMessageRef.current(event.message);
            }
            if (event.type === 'chat_closed' && onChatClosedRef.current) {
                console.log('[useChatWebSocket] Processing chat_closed from notification');
                onChatClosedRef.current(event.chatId);
            }
        });

        // Event: chat_closed - Chat foi fechado pelo operador
        socket.on('chat_closed', (data: { chatId: string }) => {
            console.log('[useChatWebSocket] Chat closed event received:', data.chatId);
            if (onChatClosedRef.current) {
                onChatClosedRef.current(data.chatId);
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
    }, [enabled, authCredentials, userAuth, getUserType, onChatClosed]);

    const disconnect = useCallback(() => {
        if (socketRef.current) {
            console.log('[useChatWebSocket] Disconnecting...');
            connectingRef.current = false;
            socketRef.current.disconnect();
            socketRef.current = null;
            if (isMountedRef.current) {
                setIsConnected(false);
            }
            joinedChatsRef.current.clear();
        }
    }, []);

    // Join chat
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

    // Leave chat
    const leaveChat = useCallback((chatIdToLeave: string, userId: string) => {
        if (!socketRef.current || !isConnected) {
            console.warn('[useChatWebSocket] Cannot leave chat: not connected');
            return;
        }

        console.log('[useChatWebSocket] Leaving chat:', chatIdToLeave);
        socketRef.current.emit('leave_chat', { chatId: chatIdToLeave, userId });
        joinedChatsRef.current.delete(chatIdToLeave);
    }, [isConnected]);

    // Send message via WebSocket (opcional, já temos REST)
    const sendMessage = useCallback((payload: { chatId: string; content: string }) => {
        if (!socketRef.current || !isConnected) {
            console.warn('[useChatWebSocket] Cannot send message: not connected');
            return;
        }

        console.log('[useChatWebSocket] Sending message via WebSocket:', payload.chatId);
        socketRef.current.emit('send_message', payload);
    }, [isConnected]);

    // Mark as read
    const markAsRead = useCallback((chatIdToMark: string, messageId: string) => {
        if (!socketRef.current || !isConnected) {
            console.warn('[useChatWebSocket] Cannot mark as read: not connected');
            return;
        }

        console.log('[useChatWebSocket] Marking as read:', chatIdToMark, messageId);
        socketRef.current.emit('mark_read', { chatId: chatIdToMark, messageId });
    }, [isConnected]);

    // Efeito para conectar/desconectar
    useEffect(() => {
        const shouldConnect = enabled && !!authCredentials?.accessToken && !!userAuth?.id;

        if (shouldConnect) {
            // Verificar se já está conectado ou conectando antes de conectar novamente
            if (socketRef.current?.connected || connectingRef.current) {
                console.log('[useChatWebSocket] Already connected or connecting, skipping');
                return;
            }

            // Pequeno delay para garantir que o token está disponível
            const timeoutId = setTimeout(() => {
                // Verificar se ainda está montado e enabled antes de conectar
                if (isMountedRef.current && enabled && !socketRef.current?.connected) {
                    connect();
                }
            }, 500);

            return () => {
                clearTimeout(timeoutId);
                // Não desconectar aqui - deixar o socket.io gerenciar a conexão
            };
        } else {
            // Se shouldConnect é false, desconectar
            disconnect();
        }
    }, [enabled, authCredentials, userAuth, connect, disconnect]);

    // Efeito para entrar/sair do chat quando chatId mudar
    useEffect(() => {
        if (!chatId || !isConnected || !socketRef.current || !userAuth?.id) {
            return;
        }

        const userId = userAuth.id;
        joinChat(chatId, userId);

        return () => {
            if (userId) {
                leaveChat(chatId, userId);
            }
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
    };
}
