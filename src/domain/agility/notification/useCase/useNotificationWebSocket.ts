import { useEffect, useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';

import { urls } from '@/config/urls';
import { serverDisconnectRetryDelay } from '@/domain/agility/chat/useCase/useChatWebSocket';
import { KEY_NOTIFICATIONS } from '@/domain/queryKeys';
import { useAuthCredentialsService } from '@/services';

import type { NotificationResponse } from '../dto';
import { aplicarNoCacheDaLista } from '../notificationGrouping';

const getWebSocketUrl = () => {
    const baseUrl = urls.agilityApi;
    // Remove http:// ou https:// e adiciona ws:// ou wss://
    const wsBase = baseUrl.replace(/^https?:\/\//, '');
    const protocol = baseUrl.startsWith('https') ? 'wss' : 'ws';
    return `${protocol}://${wsBase}`;
};

/** Teto do intervalo entre tentativas automáticas do socket.io (queda de rede). */
export const NOTIFICATION_RECONNECT_DELAY_MAX_MS = 15_000;

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
 * O gateway valida o token SÓ no handshake e, se ele estiver vencido, emite `error` e derruba
 * a conexão (`io server disconnect`) — caso em que o socket.io NÃO tenta de novo sozinho. Por
 * isso:
 * - `auth` é função: cada (re)conexão lê o token ATUAL, não o da criação do socket;
 * - derrubada pelo servidor reagenda a conexão com backoff e, antes, dispara um refetch REST das
 *   notificações — é esse 401 que faz o interceptor do axios renovar o token;
 * - ao reconectar, a lista é invalidada: o gateway não reenvia o que foi emitido com o socket fora.
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
        let tentativaDoServidor = 0;
        let caiuAntes = false;
        let timerRetentativa: ReturnType<typeof setTimeout> | null = null;

        const invalidarNotificacoes = () => {
            queryClient.invalidateQueries({ queryKey: [KEY_NOTIFICATIONS] });
        };

        const socket: Socket = io(`${getWebSocketUrl()}/notifications`, {
            auth: (cb) => cb({ token: tokenRef.current, userId, tenantId }),
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: NOTIFICATION_RECONNECT_DELAY_MAX_MS,
            reconnectionAttempts: Infinity,
        });

        // `connected` sai do gateway DEPOIS de validar o token e entrar em `user:<sub>`:
        // só a partir daqui o motorista recebe `notification`.
        socket.on('connected', () => {
            tentativaDoServidor = 0;
            if (!desmontado) setIsConnected(true);
            if (caiuAntes) {
                caiuAntes = false;
                invalidarNotificacoes();
            }
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

        socket.on('disconnect', (reason) => {
            caiuAntes = true;
            if (!desmontado) setIsConnected(false);

            // Queda de rede: o socket.io reconecta sozinho. Derrubada pelo servidor (token
            // vencido/recusado): ele NÃO tenta — agendamos, e o refetch REST renova o token.
            if (reason === 'io server disconnect' && !desmontado) {
                invalidarNotificacoes();
                const espera = serverDisconnectRetryDelay(tentativaDoServidor);
                tentativaDoServidor += 1;
                if (timerRetentativa) clearTimeout(timerRetentativa);
                timerRetentativa = setTimeout(() => {
                    timerRetentativa = null;
                    if (!desmontado) socket.connect();
                }, espera);
            }
        });

        socket.on('connect_error', (error) => {
            console.warn('[useNotificationWebSocket] Connection error:', error?.message);
            onErrorRef.current?.(error);
        });

        return () => {
            desmontado = true;
            if (timerRetentativa) clearTimeout(timerRetentativa);
            socket.disconnect();
            setIsConnected(false);
        };
    }, [enabled, temToken, userId, tenantId, queryClient]);

    return { isConnected };
}
