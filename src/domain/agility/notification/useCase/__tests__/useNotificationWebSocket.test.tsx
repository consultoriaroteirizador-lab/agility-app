import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TestRenderer, { act } from 'react-test-renderer';

import { KEY_NOTIFICATIONS } from '@/domain/queryKeys';

import type { NotificationResponse } from '../../dto';
import { NotificationStatus } from '../../dto';
import { chaveDaListaDeNotificacoes } from '../useFindAllNotifications';
import { useNotificationWebSocket } from '../useNotificationWebSocket';

type Handler = (...args: unknown[]) => void;
const mockHandlers: Record<string, Handler> = {};
const mockSocket = {
    on: jest.fn((event: string, fn: Handler) => {
        mockHandlers[event] = fn;
    }),
    connect: jest.fn(),
    disconnect: jest.fn(),
};
const mockIo = jest.fn((..._args: unknown[]) => mockSocket);
jest.mock('socket.io-client', () => ({ io: (...args: unknown[]) => mockIo(...args) }));

let mockAuth = {
    authCredentials: { accessToken: 'token-1', tenantId: 'tenant-1' },
    userAuth: { id: 'kc-1' },
};
jest.mock('@/services', () => ({ useAuthCredentialsService: () => mockAuth }));
jest.mock('@/config/urls', () => ({ urls: { agilityApi: 'https://api.test' } }));

function Probe() {
    useNotificationWebSocket();
    return null;
}

let queryClient: QueryClient;
let tree: TestRenderer.ReactTestRenderer | null = null;

function render() {
    act(() => {
        tree = TestRenderer.create(
            <QueryClientProvider client={queryClient}>
                <Probe />
            </QueryClientProvider>,
        );
    });
    // Deixa passar qualquer atraso de montagem antes do `io()`.
    act(() => jest.advanceTimersByTime(1000));
}

function rerender() {
    act(() =>
        tree!.update(
            <QueryClientProvider client={queryClient}>
                <Probe />
            </QueryClientProvider>,
        ),
    );
}

function ioOptions() {
    return mockIo.mock.calls[0][1] as {
        auth: (cb: (data: Record<string, unknown>) => void) => void;
        reconnectionAttempts: number;
    };
}

function notificacao(over: Partial<NotificationResponse> = {}): NotificationResponse {
    return {
        id: 'n-1',
        companyId: 'c-1',
        userId: 'kc-1',
        userType: 'DRIVER' as NotificationResponse['userType'],
        title: 'Nova mensagem',
        description: 'oi',
        type: 'CHAT_MESSAGE' as NotificationResponse['type'],
        status: NotificationStatus.UNREAD,
        createdAt: '2026-09-28T10:00:00.000Z',
        updatedAt: '2026-09-28T10:00:00.000Z',
        ...over,
    };
}

beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockIo.mockClear();
    mockSocket.connect.mockClear();
    mockSocket.disconnect.mockClear();
    for (const k of Object.keys(mockHandlers)) delete mockHandlers[k];
    mockAuth = { authCredentials: { accessToken: 'token-1', tenantId: 'tenant-1' }, userAuth: { id: 'kc-1' } };
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
});

afterEach(() => {
    if (tree) act(() => tree!.unmount());
    tree = null;
    queryClient.clear();
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
});

describe('useNotificationWebSocket — reconexão', () => {
    it('conecta no namespace /notifications', () => {
        render();
        expect(mockIo).toHaveBeenCalledTimes(1);
        expect(mockIo.mock.calls[0][0]).toBe('wss://api.test/notifications');
    });

    it('auth é função e entrega o token ATUAL; renovar o token não abre um segundo socket', () => {
        render();
        mockAuth = { ...mockAuth, authCredentials: { accessToken: 'token-2', tenantId: 'tenant-1' } };
        rerender();

        const cb = jest.fn();
        ioOptions().auth(cb);
        expect(cb).toHaveBeenCalledWith(expect.objectContaining({ token: 'token-2', tenantId: 'tenant-1' }));
        expect(mockIo).toHaveBeenCalledTimes(1);
        expect(mockSocket.disconnect).not.toHaveBeenCalled();
    });

    it('não desiste de reconectar numa queda de rede', () => {
        render();
        expect(ioOptions().reconnectionAttempts).toBe(Infinity);
    });

    it('servidor derrubou (token vencido): refetch REST (renova o token) e nova tentativa com backoff', () => {
        render();
        const invalidar = jest.spyOn(queryClient, 'invalidateQueries');

        act(() => mockHandlers.disconnect('io server disconnect'));
        expect(invalidar).toHaveBeenCalledWith({ queryKey: [KEY_NOTIFICATIONS] });

        act(() => jest.advanceTimersByTime(1999));
        expect(mockSocket.connect).not.toHaveBeenCalled();
        act(() => jest.advanceTimersByTime(1));
        expect(mockSocket.connect).toHaveBeenCalledTimes(1);
    });

    it('reconexão confirmada invalida a lista (o gateway não reenvia o que perdeu); a primeira não', () => {
        render();
        const invalidar = jest.spyOn(queryClient, 'invalidateQueries');

        act(() => mockHandlers.connected({}));
        expect(invalidar).not.toHaveBeenCalled();

        act(() => mockHandlers.disconnect('transport close'));
        act(() => mockHandlers.connected({}));
        expect(invalidar).toHaveBeenCalledWith({ queryKey: [KEY_NOTIFICATIONS] });
    });
});

describe('useNotificationWebSocket — cache', () => {
    it('evento `notification` chega na MESMA chave que a aba Notificações lê', () => {
        const chaveDaTela = chaveDaListaDeNotificacoes(100, 0);
        queryClient.setQueryData(chaveDaTela, [notificacao({ id: 'antiga', title: 'Antiga' })]);
        render();

        act(() => mockHandlers.notification(notificacao({ id: 'n-1', title: '2 novas mensagens' })));

        const lista = queryClient.getQueryData<NotificationResponse[]>(chaveDaTela)!;
        expect(lista.map((n) => n.id)).toEqual(['n-1', 'antiga']);
    });

    it.each(['notification:read', 'notification:all_read', 'notification:deleted'])(
        'evento do backend %s invalida as notificações',
        (evento) => {
            render();
            const invalidar = jest.spyOn(queryClient, 'invalidateQueries');
            act(() => mockHandlers[evento]({ userId: 'kc-1' }));
            expect(invalidar).toHaveBeenCalledWith({ queryKey: [KEY_NOTIFICATIONS] });
        },
    );
});
