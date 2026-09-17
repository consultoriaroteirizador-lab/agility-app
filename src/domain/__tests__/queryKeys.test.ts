import { KEY_CHATS, KEY_NOTIFICATIONS, KEY_ROUTINGS, KEY_TICKETS, PUSH_INVALIDATED_KEYS } from '../queryKeys';

describe('PUSH_INVALIDATED_KEYS', () => {
    it('push invalida rotas, notificacoes, chats e protocolos', () => {
        // Chats e protocolos entraram por causa do F3: a resposta do operador chega por push,
        // e a conversa aberta pelo toque precisa buscar de novo.
        expect(PUSH_INVALIDATED_KEYS).toEqual(
            expect.arrayContaining([KEY_ROUTINGS, KEY_NOTIFICATIONS, KEY_CHATS, KEY_TICKETS]),
        );
    });
});
