import { QueryClient } from '@tanstack/react-query';

import { KEY_CHATS, KEY_FINANCE, KEY_NOTIFICATIONS, KEY_ROUTINGS, KEY_SERVICES, KEY_TICKETS, KEY_WALLET, PUSH_INVALIDATED_KEYS } from '../queryKeys';

describe('PUSH_INVALIDATED_KEYS', () => {
    it('push invalida rotas, notificacoes, chats e protocolos', () => {
        // Chats e protocolos entraram por causa do F3: a resposta do operador chega por push,
        // e a conversa aberta pelo toque precisa buscar de novo.
        expect(PUSH_INVALIDATED_KEYS).toEqual(
            expect.arrayContaining([KEY_ROUTINGS, KEY_NOTIFICATIONS, KEY_CHATS, KEY_TICKETS]),
        );
    });

    // F5: o back manda ROUTE_COMPLETED/PAYMENT_RECEIVED pelos MESMOS eventos que criam a
    // parcela de frete e a divida/pagamento em dinheiro — sem a chave aqui, um push chegando
    // com a tela de carteira/ganhos/cobrancas montada nao atualizava o saldo.
    it('push invalida carteira e financeiro (ROUTE_COMPLETED/PAYMENT_RECEIVED nascem dos mesmos eventos)', () => {
        expect(PUSH_INVALIDATED_KEYS).toEqual(expect.arrayContaining([KEY_WALLET, KEY_FINANCE]));
    });

    // ROUTE_STOP_RELOCATED: a central corrigiu o local da parada. A tela da parada
    // (`['services', serviceId]`, staleTime 5 min) monta o link do Waze/Maps a partir
    // dessa query — sem esta chave, o motorista tocava o push e navegava para o
    // endereço ANTIGO.
    it('push invalida a parada aberta (link de navegação sai dela)', () => {
        const queryClient = new QueryClient();
        queryClient.setQueryData([KEY_SERVICES, 'servico-1'], {});

        for (const key of PUSH_INVALIDATED_KEYS) {
            void queryClient.invalidateQueries({ queryKey: [key] });
        }

        expect(queryClient.getQueryState([KEY_SERVICES, 'servico-1'])?.isInvalidated).toBe(true);
    });
});
