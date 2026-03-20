import { useEffect, useRef, useCallback, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { jwtDecode } from 'jwt-decode';
import { io, Socket } from 'socket.io-client';

import { urls } from '@/config/urls';
import { KEY_NOTIFICATIONS } from '@/domain/queryKeys';
import { useAuthCredentialsService } from '@/services';

import type { NotificationResponse } from '../dto';

const getWebSocketUrl = () => {
    const baseUrl = urls.agilityApi;
    // Remove http:// ou https:// e adiciona ws:// ou wss://
    const wsBase = baseUrl.replace(/^https?:\/\//, '');
    const protocol = baseUrl.startsWith('https') ? 'wss' : 'ws';
    return `${protocol}://${wsBase}`;
};

export interface UseNotificationWebSocketOptions {
    enabled?: boolean;
    onNotification?: (notification: NotificationResponse) => void;
    onError?: (error: Error) => void;
}

export function useNotificationWebSocket(options: UseNotificationWebSocketOptions = {}) {
    const { enabled = true, onNotification, onError } = options;
    const { authCredentials, userAuth } = useAuthCredentialsService();
    const queryClient = useQueryClient();
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const isMountedRef = useRef(true);

    // Usar refs para callbacks para evitar recriação do socket
    const onNotificationRef = useRef(onNotification);
    const onErrorRef = useRef(onError);

    // Atualizar refs quando callbacks mudarem
    useEffect(() => {
        onNotificationRef.current = onNotification;
        onErrorRef.current = onError;
    }, [onNotification, onError]);

    // Marcar componente como montado
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const connect = useCallback(() => {
        if (!enabled || socketRef.current?.connected) {
            return;
        }

        if (!authCredentials?.accessToken) {
            console.warn('[useNotificationWebSocket] Missing accessToken, cannot connect');
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
            console.error('[useNotificationWebSocket] Failed to decode token:', error);
            // Se falhar, tenta usar userAuth
            if (!userId && userAuth?.id) {
                userId = userAuth.id;
            }
        }

        if (!userId) {
            console.warn('[useNotificationWebSocket] Could not extract userId');
            return;
        }

        const wsUrl = getWebSocketUrl();
        console.log('[useNotificationWebSocket] Connecting to:', `${wsUrl}/notifications`, { userId, tenantId });

        const socketConfig: any = {
            auth: {
                userId,
            },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
        };

        // Adiciona tenantId se disponível
        if (tenantId) {
            socketConfig.auth.tenantId = tenantId;
        }

        const socket = io(`${wsUrl}/notifications`, socketConfig);

        socket.on('connect', () => {
            console.log('[useNotificationWebSocket] Connected');
            if (isMountedRef.current) {
                setIsConnected(true);
            }
        });

        socket.on('connected', (data) => {
            console.log('[useNotificationWebSocket] Connection confirmed:', data);
        });

        socket.on('notification', (notification: NotificationResponse) => {
            console.log('[useNotificationWebSocket] New notification received:', notification);
            
            // Invalida queries para atualizar a lista
            queryClient.invalidateQueries({ queryKey: [KEY_NOTIFICATIONS] });
            
            // Chama callback se fornecido
            if (onNotificationRef.current) {
                onNotificationRef.current(notification);
            }
        });

        socket.on('notification_updated', (notification: NotificationResponse) => {
            console.log('[useNotificationWebSocket] Notification updated:', notification);
            queryClient.invalidateQueries({ queryKey: [KEY_NOTIFICATIONS] });
        });

        socket.on('notification_deleted', (data: { id: string }) => {
            console.log('[useNotificationWebSocket] Notification deleted:', data.id);
            queryClient.invalidateQueries({ queryKey: [KEY_NOTIFICATIONS] });
        });

        socket.on('notifications_read_all', () => {
            console.log('[useNotificationWebSocket] All notifications marked as read');
            queryClient.invalidateQueries({ queryKey: [KEY_NOTIFICATIONS] });
        });

        socket.on('initial_unread_count', (data: { unreadCount: number }) => {
            console.log('[useNotificationWebSocket] Initial unread count:', data.unreadCount);
            queryClient.setQueryData([KEY_NOTIFICATIONS, 'unread-count'], {
                success: true,
                result: { unreadCount: data.unreadCount },
            });
        });

        socket.on('error', (error: { message: string }) => {
            console.error('[useNotificationWebSocket] Error:', error);
            if (onErrorRef.current) {
                onErrorRef.current(new Error(error.message));
            }
        });

        socket.on('disconnect', (reason) => {
            console.log('[useNotificationWebSocket] Disconnected:', reason);
            if (isMountedRef.current) {
                setIsConnected(false);
            }
        });

        socket.on('connect_error', (error) => {
            console.error('[useNotificationWebSocket] Connection error:', error);
            if (onErrorRef.current) {
                onErrorRef.current(error);
            }
        });

        socketRef.current = socket;
    }, [enabled, authCredentials, userAuth, queryClient]);

    const disconnect = useCallback(() => {
        if (socketRef.current) {
            console.log('[useNotificationWebSocket] Disconnecting...');
            socketRef.current.disconnect();
            socketRef.current = null;
            if (isMountedRef.current) {
                setIsConnected(false);
            }
        }
    }, []);

    useEffect(() => {
        const shouldConnect = enabled && !!authCredentials?.accessToken && !!userAuth?.id;

        if (shouldConnect) {
            // Pequeno delay para garantir que tudo está disponível
            const timeoutId = setTimeout(() => {
                if (isMountedRef.current && enabled) {
                    connect();
                }
            }, 500);

            return () => {
                clearTimeout(timeoutId);
                disconnect();
            };
        } else {
            disconnect();
        }
    }, [enabled, authCredentials, userAuth, connect, disconnect]);

    // Cleanup no unmount
    useEffect(() => {
        return () => {
            disconnect();
        };
    }, [disconnect]);

    return {
        isConnected,
        connect,
        disconnect,
    };
}
