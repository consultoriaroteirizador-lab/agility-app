import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TestRenderer, { act } from 'react-test-renderer';

import { MessageStatus, ParticipantType, type ChatMessage } from '../../dto/types';
import { useChatStore } from '../../store/useChatStore';
import { chatMessagesKey } from '../messagesCache';
import { usePostMessage } from '../usePostMessage';

const mockPostMessageService = jest.fn();
jest.mock('../../chatService', () => ({
    postMessageService: (...args: unknown[]) => mockPostMessageService(...args),
}));

type Hook = ReturnType<typeof usePostMessage>;

function setup() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    let hook!: Hook;
    function Probe() {
        hook = usePostMessage();
        return null;
    }
    act(() => {
        TestRenderer.create(
            <QueryClientProvider client={queryClient}>
                <Probe />
            </QueryClientProvider>,
        );
    });
    return { queryClient, getHook: () => hook };
}

function serverMessage(over: Record<string, unknown>) {
    return {
        id: 'srv-1',
        chatId: 'chat-1',
        senderId: 'driver-internal',
        senderKeycloakUserId: 'kc-1',
        senderType: 'DRIVER',
        content: 'oi',
        status: 'SENT',
        createdAt: '2026-09-16T12:00:00.000Z',
        ...over,
    };
}

function cachedIds(queryClient: QueryClient) {
    return queryClient.getQueryData<{ result: ChatMessage[] }>(chatMessagesKey('chat-1'))?.result ?? [];
}

beforeEach(() => {
    mockPostMessageService.mockReset();
    useChatStore.setState({ optimisticMessages: {} });
});

describe('usePostMessage', () => {
    it('nao manda tempId para a API e mantem senderId (contrato C1)', async () => {
        mockPostMessageService.mockResolvedValue({ success: true, result: serverMessage({}) });
        const { getHook } = setup();

        await act(async () => {
            await getHook().mutateAsync({ chatId: 'chat-1', content: 'oi', senderId: 'kc-1', tempId: 'temp-x' });
        });

        const body = mockPostMessageService.mock.calls[0][0];
        expect(body).not.toHaveProperty('tempId');
        expect(body).toMatchObject({ chatId: 'chat-1', content: 'oi', senderId: 'kc-1' });
    });

    it('texto: grava a mensagem real no cache e remove a bolha', async () => {
        mockPostMessageService.mockResolvedValue({ success: true, result: serverMessage({}) });
        const { getHook, queryClient } = setup();

        await act(async () => {
            await getHook().mutateAsync({ chatId: 'chat-1', content: 'oi', senderId: 'kc-1' });
        });

        expect(cachedIds(queryClient).map((m) => m.id)).toEqual(['srv-1']);
        expect(useChatStore.getState().optimisticMessages['chat-1']).toEqual([]);
    });

    it('anexo com tempId: nao cria segunda bolha e troca a chave pela URI local', async () => {
        const local: ChatMessage = {
            id: 'temp-a', chatId: 'chat-1', senderId: 'kc-1', senderType: ParticipantType.DRIVER,
            content: 'Imagem', attachmentUrl: 'file:///foto.jpg', status: MessageStatus.SENT,
            createdAt: '2026-09-16T12:00:00.000Z',
        };
        useChatStore.getState().addOptimisticMessage('chat-1', local);
        let bubblesDuringRequest = -1;
        mockPostMessageService.mockImplementation(async () => {
            bubblesDuringRequest = useChatStore.getState().optimisticMessages['chat-1'].length;
            return {
                success: true,
                result: serverMessage({ attachmentUrl: 'chat/c1/chat-9.jpg', attachmentType: 'image' }),
            };
        });
        const { getHook, queryClient } = setup();

        await act(async () => {
            await getHook().mutateAsync({
                chatId: 'chat-1', content: 'Imagem', senderId: 'kc-1',
                attachmentUrl: 'chat/c1/chat-9.jpg', attachmentType: 'image', tempId: 'temp-a',
            });
        });

        expect(bubblesDuringRequest).toBe(1);
        expect(mockPostMessageService.mock.calls[0][0].attachmentUrl).toBe('chat/c1/chat-9.jpg'); // C5
        expect(cachedIds(queryClient)[0].attachmentUrl).toBe('file:///foto.jpg');
        expect(useChatStore.getState().optimisticMessages['chat-1']).toEqual([]);
    });

    it('erro: remove a bolha e rejeita', async () => {
        mockPostMessageService.mockRejectedValue(new Error('rede'));
        const { getHook } = setup();

        await act(async () => {
            await expect(
                getHook().mutateAsync({ chatId: 'chat-1', content: 'oi', senderId: 'kc-1' }),
            ).rejects.toThrow('rede');
        });

        expect(useChatStore.getState().optimisticMessages['chat-1']).toEqual([]);
    });
});
