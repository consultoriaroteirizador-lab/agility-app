import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TestRenderer, { act } from 'react-test-renderer';

import { KEY_NOTIFICATIONS } from '@/domain/queryKeys';

import type { NotificationResponse } from '../../dto';
import { NotificationStatus } from '../../dto';
import { chaveDaListaDeNotificacoes } from '../useFindAllNotifications';
import { marcarTodasNoCache, useMarkAllNotificationsAsRead } from '../useMarkAllNotificationsAsRead';

const mockMarkAll = jest.fn();
jest.mock('../../notificationService', () => ({
    markAllNotificationsAsReadService: (...args: unknown[]) => mockMarkAll(...args),
}));

function notificacao(id: string, status: NotificationStatus): NotificationResponse {
    return {
        id,
        companyId: 'c-1',
        userId: 'kc-1',
        userType: 'DRIVER' as NotificationResponse['userType'],
        title: id,
        description: '',
        type: 'CHAT_MESSAGE' as NotificationResponse['type'],
        status,
        createdAt: '2026-09-28T10:00:00.000Z',
        updatedAt: '2026-09-28T10:00:00.000Z',
    };
}

const CHAVE_LISTA = chaveDaListaDeNotificacoes(100, 0);
const CHAVE_CONTADOR = [KEY_NOTIFICATIONS, 'unread-count'];

let api!: ReturnType<typeof useMarkAllNotificationsAsRead>;
function Probe() {
    api = useMarkAllNotificationsAsRead();
    return null;
}

let queryClient: QueryClient;
let tree: TestRenderer.ReactTestRenderer | null = null;

beforeEach(() => {
    mockMarkAll.mockReset();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } } });
    queryClient.setQueryData(CHAVE_LISTA, [
        notificacao('a', NotificationStatus.UNREAD),
        notificacao('b', NotificationStatus.READ),
        notificacao('c', NotificationStatus.UNREAD),
    ]);
    queryClient.setQueryData(CHAVE_CONTADOR, { unreadCount: 277 });
    act(() => {
        tree = TestRenderer.create(
            <QueryClientProvider client={queryClient}>
                <Probe />
            </QueryClientProvider>,
        );
    });
});

afterEach(() => {
    if (tree) act(() => tree!.unmount());
    tree = null;
    queryClient.clear();
});

function statusDaLista() {
    return queryClient.getQueryData<NotificationResponse[]>(CHAVE_LISTA)!.map((n) => n.status);
}

describe('useMarkAllNotificationsAsRead', () => {
    it('otimista: lista toda lida e contador (badge) zerado ANTES da resposta', async () => {
        let responder!: (v: unknown) => void;
        mockMarkAll.mockReturnValue(new Promise((r) => (responder = r)));

        await act(async () => {
            api.markAllAsRead();
            await Promise.resolve();
        });

        expect(statusDaLista()).toEqual(['READ', 'READ', 'READ']);
        expect(queryClient.getQueryData(CHAVE_CONTADOR)).toEqual({ unreadCount: 0 });

        await act(async () => {
            responder({ success: true, result: { message: 'ok' } });
        });
        expect(mockMarkAll).toHaveBeenCalledTimes(1);
    });

    it('erro do servidor: devolve a lista e o contador de antes', async () => {
        mockMarkAll.mockRejectedValue(new Error('500'));

        await act(async () => {
            api.markAllAsRead();
        });
        await act(async () => {
            await Promise.resolve();
        });

        expect(statusDaLista()).toEqual(['UNREAD', 'READ', 'UNREAD']);
        expect(queryClient.getQueryData(CHAVE_CONTADOR)).toEqual({ unreadCount: 277 });
    });

    it('resposta com success=false também reverte', async () => {
        mockMarkAll.mockResolvedValue({ success: false, error: { message: 'nao' } });

        await act(async () => {
            api.markAllAsRead();
        });
        await act(async () => {
            await Promise.resolve();
        });

        expect(statusDaLista()).toEqual(['UNREAD', 'READ', 'UNREAD']);
        expect(queryClient.getQueryData(CHAVE_CONTADOR)).toEqual({ unreadCount: 277 });
    });
});

describe('marcarTodasNoCache', () => {
    it('aceita o BaseResponse da lista de não lidas e passa intacto o que não é lista', () => {
        const resposta = { success: true, result: [notificacao('a', NotificationStatus.UNREAD)] };
        const saida = marcarTodasNoCache(resposta, 'agora') as typeof resposta;
        expect(saida.result[0]).toEqual(expect.objectContaining({ status: 'READ', readAt: 'agora' }));
        expect(marcarTodasNoCache({ unreadCount: 3 }, 'agora')).toEqual({ unreadCount: 3 });
    });
});
