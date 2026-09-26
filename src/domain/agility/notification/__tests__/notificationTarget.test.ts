import type { NotificationResponse } from '../dto';
import { NotificationStatus, NotificationType, UserType } from '../dto';
import {
    caminhoComparavelDoDestino,
    iconeDaNotificacao,
    normalizarCaminho,
    resolverDestinoDaNotificacao,
} from '../notificationTarget';

function notificacao(parcial: Partial<NotificationResponse>): NotificationResponse {
    return {
        id: 'n1',
        companyId: 'c1',
        userId: 'u1',
        userType: UserType.DRIVER,
        title: 'Título',
        description: 'Texto',
        type: NotificationType.SYSTEM_ALERT,
        status: NotificationStatus.UNREAD,
        createdAt: '2026-09-26T12:00:00.000Z',
        updatedAt: '2026-09-26T12:00:00.000Z',
        ...parcial,
    };
}

describe('resolverDestinoDaNotificacao', () => {
    // Mesmo destino que a aba Notificações usava inline — agora a aba e o banner leem daqui.
    it.each([
        [NotificationType.ROUTE_REPLANNED, { routingId: 'r1' }, '/rotas-detalhadas/r1'],
        [NotificationType.ROUTE_STARTED, { routingId: 'r1' }, '/rotas-detalhadas/r1'],
        [NotificationType.ROUTE_COMPLETED, { routingId: 'r1' }, '/rotas-detalhadas/r1'],
        [NotificationType.SERVICE_ADDED, { routingId: 'r1', serviceId: 's1' }, '/rotas-detalhadas/r1/parada/s1'],
        [NotificationType.SERVICE_REMOVED, { routingId: 'r1', serviceId: 's1' }, '/rotas-detalhadas/r1/parada/s1'],
        [NotificationType.SERVICE_REMOVED, { routingId: 'r1' }, '/rotas-detalhadas/r1'],
        [NotificationType.SERVICE_COMPLETED, { routingId: 'r1', serviceId: 's1' }, '/rotas-detalhadas/r1/parada/s1'],
        [NotificationType.SERVICE_COMPLETED, {}, '/(auth)/(tabs)/menu/historico'],
        [NotificationType.ROUTE_OFFER, { routingId: 'r1' }, '/ofertas/r1'],
        [NotificationType.ROUTE_OFFER, {}, '/ofertas'],
        [NotificationType.PAYMENT_RECEIVED, {}, '/menu/ganhos'],
        [NotificationType.CHAT_MESSAGE, { chatId: 'c9' }, '/menu/suporte/c9'],
        [NotificationType.CHAT_MESSAGE, {}, '/menu/suporte'],
    ])('%s com %j vai para %s', (type, metadata, caminho) => {
        expect(resolverDestinoDaNotificacao(notificacao({ type, metadata }))).toEqual({ tipo: 'caminho', caminho });
    });

    it('rota sem routingId não tem destino', () => {
        expect(resolverDestinoDaNotificacao(notificacao({ type: NotificationType.ROUTE_REPLANNED }))).toBeNull();
    });

    it('linkUrl com barra vira caminho', () => {
        expect(resolverDestinoDaNotificacao(notificacao({ linkUrl: '/menu/ganhos' })))
            .toEqual({ tipo: 'caminho', caminho: '/menu/ganhos' });
    });

    it('linkUrl sem barra é nome de rota do mapa compartilhado, com metadata.params', () => {
        expect(resolverDestinoDaNotificacao(notificacao({ linkUrl: 'suporte', metadata: { chatId: 'c1', params: { id: 'c1' } } })))
            .toEqual({ tipo: 'nomeada', rota: 'suporte', params: { id: 'c1' } });
    });

    it('linkUrl nomeada sem metadata.params usa a metadata inteira', () => {
        expect(resolverDestinoDaNotificacao(notificacao({ linkUrl: 'ofertas', metadata: { id: 'r1' } })))
            .toEqual({ tipo: 'nomeada', rota: 'ofertas', params: { id: 'r1' } });
    });

    it('sem linkUrl nem tipo conhecido não tem destino', () => {
        expect(resolverDestinoDaNotificacao(notificacao({}))).toBeNull();
    });
});

describe('caminhoComparavelDoDestino', () => {
    it('tira os grupos do expo-router, que o usePathname não devolve', () => {
        expect(caminhoComparavelDoDestino({ tipo: 'caminho', caminho: '/(auth)/(tabs)/menu/historico' }))
            .toBe('/menu/historico');
    });

    it('rota nomeada de chat vira o caminho da conversa', () => {
        expect(caminhoComparavelDoDestino({ tipo: 'nomeada', rota: 'suporte', params: { id: 'c1' } })).toBe('/menu/suporte/c1');
        expect(caminhoComparavelDoDestino({ tipo: 'nomeada', rota: 'chat', params: { chatId: 'c2' } })).toBe('/menu/suporte/c2');
    });

    it('outra rota nomeada não tem caminho comparável', () => {
        expect(caminhoComparavelDoDestino({ tipo: 'nomeada', rota: 'ofertas', params: { id: 'r1' } })).toBeNull();
    });
});

describe('normalizarCaminho', () => {
    it('tira grupos, query e barra final', () => {
        expect(normalizarCaminho('/(auth)/(tabs)/menu/suporte/c1/?x=1')).toBe('/menu/suporte/c1');
        expect(normalizarCaminho('/')).toBe('/');
    });
});

describe('iconeDaNotificacao', () => {
    it('mapeia os tipos conhecidos e cai em info no resto', () => {
        expect(iconeDaNotificacao(NotificationType.ROUTE_REPLANNED)).toBe('alt-route');
        expect(iconeDaNotificacao(NotificationType.SERVICE_REMOVED)).toBe('remove-circle');
        expect(iconeDaNotificacao(NotificationType.CHAT_MESSAGE)).toBe('chat');
        expect(iconeDaNotificacao('OUTRO' as NotificationType)).toBe('info');
    });
});
