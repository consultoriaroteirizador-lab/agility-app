import React from 'react';

import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import TestRenderer, { act } from 'react-test-renderer';

import type { Id } from '@/types/base';

import { CHAT_OFFLINE_POLL_MS, useGetChatMessages } from '../useGetChatMessages';

// useQuery real, embrulhado num spy: o teste le as opcoes que o hook passou.
jest.mock('@tanstack/react-query', () => {
    const actual = jest.requireActual('@tanstack/react-query');
    return { ...actual, useQuery: jest.fn(actual.useQuery) };
});
jest.mock('../../chatService', () => ({
    getChatMessagesService: jest.fn(() => new Promise(() => {})),
}));

const mockUseQuery = useQuery as jest.Mock;

// Desmonta e limpa ao fim de cada teste: o polling (refetchInterval) e o gc do cache
// seguram timers e impedem o jest de sair.
const cleanups: (() => void)[] = [];

function render(chatId: Id | undefined, options?: { refetchIntervalMs?: number | false }) {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    function Probe() {
        useGetChatMessages(chatId, options);
        return null;
    }
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
        renderer = TestRenderer.create(
            <QueryClientProvider client={queryClient}>
                <Probe />
            </QueryClientProvider>,
        );
    });
    cleanups.push(() => {
        act(() => renderer.unmount());
        queryClient.clear();
    });
}

function optionsOfLastCall() {
    return mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1][0];
}

describe('useGetChatMessages', () => {
    beforeEach(() => mockUseQuery.mockClear());
    afterEach(() => {
        cleanups.splice(0).forEach((cleanup) => cleanup());
    });

    it('sempre busca de novo ao abrir a conversa (F3)', () => {
        render('chat-1');
        expect(optionsOfLastCall()).toMatchObject({
            queryKey: ['chats', 'chat-1', 'messages'],
            staleTime: 0,
            refetchOnMount: 'always',
            refetchInterval: false,
        });
    });

    it('repassa o intervalo de polling quando pedido', () => {
        render('chat-1', { refetchIntervalMs: CHAT_OFFLINE_POLL_MS });
        expect(optionsOfLastCall().refetchInterval).toBe(15_000);
    });

    it('sem chatId nao busca', () => {
        render(undefined);
        expect(optionsOfLastCall().enabled).toBe(false);
    });
});
