import { io, type Socket } from 'socket.io-client';

import { urls } from '@/config/urls';

/**
 * Socket.IO autenticado dos gateways do backend (/chat, /monitoring, /notifications).
 *
 * Os três gateways validam o JWT SÓ no `handleConnection`: com token vencido emitem
 * `error` ("Invalid or expired token") e chamam `client.disconnect()`. Do lado do
 * cliente isso chega como `disconnect` com motivo `io server disconnect`, e nesse caso
 * o socket.io-client NÃO tenta de novo sozinho. Um socket com o token congelado na
 * criação morria em silêncio na primeira queda depois de ~15 min (segundo plano, troca
 * de rede, deploy). Esta função concentra a regra para os três não divergirem:
 *
 * - `auth` é função: cada (re)conexão lê o token ATUAL via `getAuth`;
 * - tentativas infinitas numa queda de rede (quem desiste é o motorista, não o app);
 * - `io server disconnect` chama `onServerDisconnect` (o consumidor dispara um refetch
 *   REST, e é o 401 dele que faz o interceptor do axios renovar o token) e reagenda
 *   `connect()` com backoff;
 * - `onReady({ reconnected })` sai no evento `connected` do servidor (emitido DEPOIS de
 *   validar o token e juntar as salas automáticas). Numa RE-conexão o servidor esqueceu
 *   as salas pedidas por evento (`join_chat`, `subscribe_routings`) e não reenvia o que
 *   foi emitido com o socket fora: o consumidor re-inscreve e recarrega ali.
 *
 * O helper registra os próprios `connected`/`disconnect`; o consumidor recebe esses
 * dois pelos callbacks em vez de escutar direto.
 */

/** Teto do intervalo entre tentativas automáticas do socket.io (queda de rede). */
export const SOCKET_RECONNECT_DELAY_MAX_MS = 15_000;

/**
 * Espera antes de reconectar quando o SERVIDOR derrubou a conexão (token vencido).
 * Dá tempo ao refetch REST de renovar o token antes da próxima tentativa.
 */
export function serverDisconnectRetryDelay(attempt: number): number {
    return Math.min(30_000, 2_000 * 2 ** attempt);
}

/** `https://api` -> `wss://api` (e `http` -> `ws`). */
export function socketBaseUrl(): string {
    const baseUrl = urls.agilityApi;
    const wsBase = baseUrl.replace(/^https?:\/\//, '');
    const protocol = baseUrl.startsWith('https') ? 'wss' : 'ws';
    return `${protocol}://${wsBase}`;
}

export interface AuthedSocketOptions {
    /** Namespace do gateway, com a barra: `/chat`, `/monitoring`, `/notifications`. */
    namespace: `/${string}`;
    /** Lido a CADA tentativa de handshake. Deve devolver o token atual. */
    getAuth: () => Record<string, unknown>;
    query?: Record<string, string>;
    path?: string;
    /** Servidor derrubou (token vencido/recusado): hora de forçar a renovação do token. */
    onServerDisconnect?: () => void;
    /** Servidor confirmou a conexão (`connected`). `reconnected` = houve queda antes. */
    onReady?: (info: { reconnected: boolean }) => void;
    onDisconnect?: (reason: string) => void;
}

export interface AuthedSocket {
    socket: Socket;
    /** Cancela a retentativa agendada e desconecta. Depois disso nada reconecta. */
    dispose: () => void;
}

export function createAuthedSocket(options: AuthedSocketOptions): AuthedSocket {
    const { namespace, getAuth, query, path, onServerDisconnect, onReady, onDisconnect } = options;

    let disposed = false;
    let serverAttempt = 0;
    let dropped = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const clearRetry = () => {
        if (retryTimer) {
            clearTimeout(retryTimer);
            retryTimer = null;
        }
    };

    const socket = io(`${socketBaseUrl()}${namespace}`, {
        ...(path ? { path } : {}),
        auth: (cb) => cb(getAuth()),
        ...(query ? { query } : {}),
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: SOCKET_RECONNECT_DELAY_MAX_MS,
        reconnectionAttempts: Infinity,
    });

    socket.on('connected', () => {
        serverAttempt = 0;
        const reconnected = dropped;
        dropped = false;
        if (!disposed) onReady?.({ reconnected });
    });

    socket.on('disconnect', (reason: string) => {
        dropped = true;
        if (disposed) return;
        onDisconnect?.(reason);

        // Queda de rede: o socket.io reconecta sozinho. Derrubada pelo servidor: ele não
        // tenta, então pedimos a renovação do token e agendamos com backoff.
        if (reason !== 'io server disconnect') return;
        onServerDisconnect?.();
        const wait = serverDisconnectRetryDelay(serverAttempt);
        serverAttempt += 1;
        clearRetry();
        retryTimer = setTimeout(() => {
            retryTimer = null;
            if (!disposed) socket.connect();
        }, wait);
    });

    return {
        socket,
        dispose: () => {
            disposed = true;
            clearRetry();
            socket.disconnect();
        },
    };
}
