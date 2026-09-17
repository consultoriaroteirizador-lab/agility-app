import { MessageStatus, ParticipantType, type ChatMessage } from '../../dto/types';
import {
    isRemoteUrl,
    pendingOptimisticMessages,
    toChatMessage,
    upsertServerMessages,
    withDisplayableAttachment,
} from '../messageUtils';

function msg(over: Partial<ChatMessage> & { id: string }): ChatMessage {
    return {
        chatId: 'chat-1',
        senderId: 'driver-internal',
        senderType: ParticipantType.DRIVER,
        content: 'oi',
        status: MessageStatus.SENT,
        createdAt: '2026-09-16T12:00:00.000Z',
        ...over,
    };
}

describe('toChatMessage', () => {
    it('preserva senderKeycloakUserId e anexo', () => {
        const out = toChatMessage(
            {
                id: 'm1', senderId: 'int-1', senderKeycloakUserId: 'kc-1', senderType: 'DRIVER',
                content: 'x', attachmentUrl: 'https://s3/a.png', attachmentType: 'image',
                createdAt: '2026-09-16T12:00:00.000Z',
            },
            'chat-1',
        );
        expect(out).toMatchObject({
            id: 'm1', chatId: 'chat-1', senderKeycloakUserId: 'kc-1', attachmentUrl: 'https://s3/a.png',
        });
    });

    it('usa o chatId recebido quando a mensagem nao traz', () => {
        expect(toChatMessage({ id: 'm1' }, 'chat-9').chatId).toBe('chat-9');
    });
});

describe('isRemoteUrl', () => {
    it.each([
        ['https://bucket/x.pdf', true],
        ['HTTP://bucket/x.pdf', true],
        ['chat/company/chat-1.pdf', false],
        ['file:///data/x.jpg', false],
        ['javascript:alert(1)', false],
        [undefined, false],
    ])('%s -> %s', (url, expected) => {
        expect(isRemoteUrl(url)).toBe(expected);
    });
});

describe('withDisplayableAttachment', () => {
    it('troca chave relativa pela URI local', () => {
        const server = msg({ id: 'm1', attachmentUrl: 'chat/c1/chat-1.jpg' });
        expect(withDisplayableAttachment(server, 'file:///local.jpg').attachmentUrl).toBe('file:///local.jpg');
    });

    it('mantem URL assinada do servidor', () => {
        const server = msg({ id: 'm1', attachmentUrl: 'https://s3/x.jpg' });
        expect(withDisplayableAttachment(server, 'file:///local.jpg').attachmentUrl).toBe('https://s3/x.jpg');
    });

    it('sem URI local devolve a mensagem como veio', () => {
        const server = msg({ id: 'm1', attachmentUrl: 'chat/c1/chat-1.jpg' });
        expect(withDisplayableAttachment(server)).toBe(server);
    });
});

describe('upsertServerMessages', () => {
    it('a versao que chega substitui a existente de mesmo id', () => {
        const out = upsertServerMessages(
            [msg({ id: 'm1', status: MessageStatus.SENT })],
            [msg({ id: 'm1', status: MessageStatus.READ })],
        );
        expect(out).toHaveLength(1);
        expect(out[0].status).toBe(MessageStatus.READ);
    });

    it('nao troca URL exibivel por chave relativa', () => {
        const out = upsertServerMessages(
            [msg({ id: 'm1', attachmentUrl: 'file:///local.jpg' })],
            [msg({ id: 'm1', attachmentUrl: 'chat/c1/chat-1.jpg' })],
        );
        expect(out[0].attachmentUrl).toBe('file:///local.jpg');
    });

    it('troca URI local por URL assinada', () => {
        const out = upsertServerMessages(
            [msg({ id: 'm1', attachmentUrl: 'file:///local.jpg' })],
            [msg({ id: 'm1', attachmentUrl: 'https://s3/x.jpg' })],
        );
        expect(out[0].attachmentUrl).toBe('https://s3/x.jpg');
    });

    it('acrescenta as novas e ordena por createdAt', () => {
        const out = upsertServerMessages(
            [msg({ id: 'm2', createdAt: '2026-09-16T12:00:02.000Z' })],
            [msg({ id: 'm1', createdAt: '2026-09-16T12:00:01.000Z' })],
        );
        expect(out.map(m => m.id)).toEqual(['m1', 'm2']);
    });
});

describe('pendingOptimisticMessages', () => {
    const t0 = '2026-09-16T12:00:00.000Z';

    it('texto confirmado pelo servidor (casando pelo keycloak) sai da lista', () => {
        const optimistic = [msg({ id: 'temp-1', senderId: 'kc-1', content: 'oi', createdAt: t0 })];
        const server = [msg({
            id: 'm1', senderId: 'int-1', senderKeycloakUserId: 'kc-1', content: 'oi',
            createdAt: '2026-09-16T12:00:05.000Z',
        })];
        expect(pendingOptimisticMessages(optimistic, server)).toEqual([]);
    });

    it('uma mensagem do servidor confirma no maximo uma bolha', () => {
        const optimistic = [
            msg({ id: 'temp-1', senderId: 'kc-1', content: 'ok', createdAt: t0 }),
            msg({ id: 'temp-2', senderId: 'kc-1', content: 'ok', createdAt: '2026-09-16T12:00:01.000Z' }),
        ];
        const server = [msg({ id: 'm1', senderKeycloakUserId: 'kc-1', content: 'ok', createdAt: t0 })];
        expect(pendingOptimisticMessages(optimistic, server).map(m => m.id)).toEqual(['temp-2']);
    });

    it('anexo nunca e confirmado por heuristica', () => {
        const optimistic = [msg({ id: 'temp-1', senderId: 'kc-1', attachmentUrl: 'file:///a.jpg', createdAt: t0 })];
        const server = [msg({ id: 'm1', senderKeycloakUserId: 'kc-1', attachmentUrl: 'https://s3/a.jpg', createdAt: t0 })];
        expect(pendingOptimisticMessages(optimistic, server).map(m => m.id)).toEqual(['temp-1']);
    });

    it('fora da janela de 60s continua pendente', () => {
        const optimistic = [msg({ id: 'temp-1', senderId: 'kc-1', content: 'oi', createdAt: t0 })];
        const server = [msg({
            id: 'm1', senderKeycloakUserId: 'kc-1', content: 'oi', createdAt: '2026-09-16T12:01:00.000Z',
        })];
        expect(pendingOptimisticMessages(optimistic, server)).toHaveLength(1);
    });

    it('remetente diferente nao confirma', () => {
        const optimistic = [msg({ id: 'temp-1', senderId: 'kc-1', content: 'oi', createdAt: t0 })];
        const server = [msg({ id: 'm1', senderId: 'op-1', senderKeycloakUserId: 'kc-op', content: 'oi', createdAt: t0 })];
        expect(pendingOptimisticMessages(optimistic, server)).toHaveLength(1);
    });
});
