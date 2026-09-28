import { useEffect, useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { KEY_NOTIFICATIONS } from '@/domain/queryKeys';
import { useAuthCredentialsService } from '@/services';
import { createAuthedSocket } from '@/services/socket/createAuthedSocket';

import type { NotificationResponse } from '../dto';
import { aplicarNoCacheDaLista } from '../notificationGrouping';

/**
 * Eventos que o `NotificationGateway` do backend emite para `user:<sub>`
 * (`notification.gateway.ts`: `notifyRead`, `notifyAllRead`, `notifyDeleted`).
 * Os nomes antigos com `_` nunca existiram no backend e ficam só por tolerância.
 */
const EVENTOS_QUE_MUDAM_A_LISTA = [
    'notification:read',
    'notification:all_read',
    'notification:deleted',
    'notification_updated',
    'notification_deleted',
    'notifications_read_all',
] as const;

export interface UseNotificationWebSocketOptions {
    enabled?: boolean;
    onNotification?: (notification: NotificationResponse) => void;
    onError?: (error: Error) => void;
}

/**
 * Socket `/notifications`: o gateway põe o motorista na sala `user:<sub>` ao validar o token e
 * emite `notification` ali a cada aviso novo (inclusive a linha agrupada de chat, reemitida
 * com o mesmo id a cada mensagem).
 *
 * Token lido a cada tentativa, reconexão infinita e `io server disconnect` (token vencido) ficam
 * com `createAuthedSocket`. Aqui: a derrubada pelo servidor dispara o refetch REST das
 * notificações (é esse 401 que renova o token) e a reconexão invalida a lista — o gateway não
 * reenvia o que foi emitido com o socket fora.
 */
export function useNotificationWebSocket(options: UseNotificationWebSocketOptions = {}) {
    const { enabled = true, onNotification, onError } = options;
    const { authCredentials, userAuth } = useAuthCredentialsService();
    const queryClient = useQueryClient();
    const [isConnected, setIsConnected] = useState(false);

    const accessToken = authCredentials?.accessToken ?? null;
    const tenantId = authCredentials?.tenantId ?? null;
    const userId = userAuth?.id ?? null;
    const temToken = !!accessToken;

    // Token lido a cada tentativa: a renovação troca `authCredentials` sem recriar o socket.
    const tokenRef = useRef(accessToken);
    useEffect(() => {
        tokenRef.current = accessToken;
    }, [accessToken]);

    const onNotificationRef = useRef(onNotification);
    const onErrorRef = useRef(onError);
    useEffect(() => {
        onNotificationRef.current = onNotification;
        onErrorRef.current = onError;
    }, [onNotification, onError]);

    useEffect(() => {
        if (!enabled || !temToken || !userId || !tenantId) {
            return;
        }

        let desmontado = false;

        const invalidarNotificacoes = () => {
            queryClient.invalidateQueries({ queryKey: [KEY_NOTIFICATIONS] });
        };

        const { socket, dispose } = createAuthedSocket({
            namespace: '/notifications',
            getAuth: () => ({ token: tokenRef.current, userId, tenantId }),
            // `connected` sai do gateway DEPOIS de validar o token e entrar em `user:<sub>`:
            // só a partir daqui o motorista recebe `notification`.
            onReady: ({ reconnected }) => {
                if (!desmontado) setIsConnected(true);
                if (reconnected) invalidarNotificacoes();
            },
            onDisconnect: () => {
                if (!desmontado) setIsConnected(false);
            },
            // O refetch REST é o que renova o token (401 -> interceptor do axios).
            onServerDisconnect: invalidarNotificacoes,
        });

        socket.on('notification', (notification: NotificationResponse) => {
            // Upsert por id nas listas em cache: a notificação agrupada de chat chega de novo com o
            // MESMO id a cada mensagem — substitui o item e sobe para o topo, em vez de duplicar.
            // A invalidação depois confirma com o servidor (contagem de não lidas inclusive).
            queryClient.setQueriesData({ queryKey: [KEY_NOTIFICATIONS, 'all'] }, (dado: unknown) =>
                aplicarNoCacheDaLista(dado, notification, false),
            );
            queryClient.setQueriesData({ queryKey: [KEY_NOTIFICATIONS, 'unread'] }, (dado: unknown) =>
                aplicarNoCacheDaLista(dado, notification, true),
            );
            invalidarNotificacoes();
            onNotificationRef.current?.(notification);
        });

        for (const evento of EVENTOS_QUE_MUDAM_A_LISTA) {
            socket.on(evento, invalidarNotificacoes);
        }

        socket.on('initial_unread_count', (data: { unreadCount: number }) => {
            // Mesmo formato que `useGetUnreadCount` guarda (o `result` da resposta REST).
            queryClient.setQueryData([KEY_NOTIFICATIONS, 'unread-count'], { unreadCount: data.unreadCount });
        });

        socket.on('error', (error: { message: string }) => {
            console.warn('[useNotificationWebSocket] Error:', error?.message);
            onErrorRef.current?.(new Error(error?.message));
        });

        socket.on('connect_error', (error) => {
            console.warn('[useNotificationWebSocket] Connection error:', error?.message);
            onErrorRef.current?.(error);
        });

        return () => {
            desmontado = true;
            dispose();
            setIsConnected(false);
        };
    }, [enabled, temToken, userId, tenantId, queryClient]);

    return { isConnected };
}
