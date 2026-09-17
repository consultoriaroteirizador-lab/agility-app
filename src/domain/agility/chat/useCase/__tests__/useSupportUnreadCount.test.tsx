import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TestRenderer, { act } from 'react-test-renderer';

import { SUPPORT_UNREAD_POLL_MS, useSupportUnreadCount } from '../useSupportUnreadCount';

const mockUnread = jest.fn();
jest.mock('../../chatService', () => ({
    getUnreadCountService: (...args: unknown[]) => mockUnread(...args),
}));

let mockActiveChat: { id: string } | null = { id: 'chat-1' };
jest.mock('../useFindActiveChatByUser', () => ({
    useFindActiveChatByUser: () => ({ activeChat: mockActiveChat }),
}));

jest.mock('@/services', () => ({ useAuthCredentialsService: () => ({ userAuth: { id: 'kc-1' } }) }));

let count = -1;

function Probe() {
    count = useSupportUnreadCount();
    return null;
}

// Desmonta e limpa ao fim de cada teste: o polling (refetchInterval) e o gc do cache
// seguram timers e impedem o jest de sair (mesmo padrao de useGetChatMessages.test.tsx).
const cleanups: (() => void)[] = [];

async function renderAndFlush() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
        renderer = TestRenderer.create(
            <QueryClientProvider client={queryClient}>
                <Probe />
            </QueryClientProvider>,
        );
    });
    await act(async () => {
        await Promise.resolve();
    });
    cleanups.push(() => {
        act(() => renderer.unmount());
        queryClient.clear();
    });
    return queryClient;
}

// A resolucao da query mockada passa por mais de um encadeamento de promise dentro do
// react-query (fetch -> dispatch -> notifyManager, cada um agendado em microtask) antes de
// comitar no estado do React. Um unico flush de microtask (como o renderAndFlush faz) as
// vezes nao e suficiente e o teste lia o valor antigo (flaky). Em vez de aumentar um numero
// fixo de flushes (mesma fragilidade, so com folga maior), espera pela condicao de verdade,
// com um teto para nunca travar o jest se o comportamento quebrar de verdade.
async function waitForCondition(predicate: () => boolean, maxTries = 50) {
    for (let i = 0; i < maxTries && !predicate(); i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await act(async () => {
            await Promise.resolve();
        });
    }
}

beforeEach(() => {
    mockUnread.mockReset();
    mockActiveChat = { id: 'chat-1' };
    count = -1;
});

afterEach(() => {
    cleanups.splice(0).forEach((cleanup) => cleanup());
});

describe('useSupportUnreadCount', () => {
    it('conta as nao lidas do chat ativo do motorista', async () => {
        mockUnread.mockResolvedValue({ success: true, result: { unreadCount: 3 } });
        await renderAndFlush();
        await waitForCondition(() => count === 3);
        expect(mockUnread).toHaveBeenCalledWith('chat-1', 'kc-1');
        expect(count).toBe(3);
    });

    it('sem chat ativo: zero e nenhuma chamada', async () => {
        mockActiveChat = null;
        await renderAndFlush();
        expect(mockUnread).not.toHaveBeenCalled();
        expect(count).toBe(0);
    });

    it('usa polling de 60s', async () => {
        mockUnread.mockResolvedValue({ success: true, result: { unreadCount: 0 } });
        const queryClient = await renderAndFlush();
        const query = queryClient.getQueryCache().find({ queryKey: ['chats', 'chat-1', 'unread', 'kc-1'] });
        expect((query?.observers[0]?.options as { refetchInterval?: number }).refetchInterval).toBe(SUPPORT_UNREAD_POLL_MS);
    });
});
