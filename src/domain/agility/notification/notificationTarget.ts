import type { IconNameMaterial } from '@/components/Icon/Icon';

import type { NotificationResponse } from './dto';
import { NotificationType } from './dto';

/**
 * Para onde leva tocar numa notificação. Dois vocabulários convivem:
 * - `caminho`: URL do expo-router, montada a partir do tipo + metadata;
 * - `nomeada`: NOME de rota do mapa compartilhado (`notificationRoutes.ts`), o mesmo que o push usa
 *   em `data.route` — o backend manda assim no `linkUrl` (ex.: `'suporte'` na mensagem de chat).
 *
 * A aba Notificações e o banner in-app leem daqui, para os dois levarem ao mesmo lugar.
 */
export type DestinoNotificacao =
    | { tipo: 'caminho'; caminho: string }
    | { tipo: 'nomeada'; rota: string; params?: Record<string, any> };

export function resolverDestinoDaNotificacao(notification: NotificationResponse): DestinoNotificacao | null {
    const routingId = notification.metadata?.routingId;
    const serviceId = notification.metadata?.serviceId;
    const caminho = (c: string): DestinoNotificacao => ({ tipo: 'caminho', caminho: c });

    switch (notification.type) {
        case NotificationType.ROUTE_REPLANNED:
        case NotificationType.ROUTE_STARTED:
        case NotificationType.ROUTE_COMPLETED:
            return routingId ? caminho(`/rotas-detalhadas/${routingId}`) : null;

        case NotificationType.SERVICE_ADDED:
        case NotificationType.SERVICE_REMOVED:
            if (routingId && serviceId) return caminho(`/rotas-detalhadas/${routingId}/parada/${serviceId}`);
            return routingId ? caminho(`/rotas-detalhadas/${routingId}`) : null;

        case NotificationType.SERVICE_COMPLETED:
            if (routingId && serviceId) return caminho(`/rotas-detalhadas/${routingId}/parada/${serviceId}`);
            return caminho('/(auth)/(tabs)/menu/historico');

        case NotificationType.ROUTE_OFFER:
            return caminho(routingId ? `/ofertas/${routingId}` : '/ofertas');

        case NotificationType.PAYMENT_RECEIVED:
            return caminho('/menu/ganhos');

        case NotificationType.CHAT_MESSAGE: {
            const chatId = notification.metadata?.chatId;
            return caminho(chatId ? `/menu/suporte/${chatId}` : '/menu/suporte');
        }

        case NotificationType.SYSTEM_ALERT:
        default:
            if (notification.linkUrl?.startsWith('/')) return caminho(notification.linkUrl);
            if (notification.linkUrl) {
                // `linkUrl` também pode ser um NOME de rota ('suporte', 'ofertas'), o mesmo
                // vocabulário que o push usa. Resolver pelo mapa compartilhado evita que o item
                // da lista fique morto enquanto o push equivalente funciona — foi o que
                // aconteceu com o aviso de atendimento encerrado.
                return {
                    tipo: 'nomeada',
                    rota: notification.linkUrl,
                    params: notification.metadata?.params ?? notification.metadata,
                };
            }
            return null;
    }
}

/**
 * Tira grupos do expo-router (`/(auth)/(tabs)`), query string e barra final: é a forma que
 * `usePathname()` devolve, e é nela que "o motorista já está nesta tela" se compara.
 */
export function normalizarCaminho(caminho: string): string {
    const semQuery = caminho.split('?')[0];
    const segmentos = semQuery.split('/').filter((s) => s !== '' && !/^\(.*\)$/.test(s));
    return `/${segmentos.join('/')}`;
}

/** Rotas nomeadas que abrem a conversa de suporte (ver `goToSupportChat` em `notificationRoutes.ts`). */
const ROTAS_NOMEADAS_DE_CHAT = new Set(['suporte', 'chat']);

/**
 * Caminho do destino na forma de `usePathname()`, ou null quando não dá para saber sem navegar
 * (rota nomeada que não é chat).
 */
export function caminhoComparavelDoDestino(destino: DestinoNotificacao): string | null {
    if (destino.tipo === 'caminho') return normalizarCaminho(destino.caminho);
    if (ROTAS_NOMEADAS_DE_CHAT.has(destino.rota)) {
        const chatId = destino.params?.id ?? destino.params?.chatId;
        return chatId ? `/menu/suporte/${chatId}` : '/menu/suporte';
    }
    return null;
}

export function iconeDaNotificacao(type: NotificationType): IconNameMaterial {
    switch (type) {
        case NotificationType.ROUTE_REPLANNED:
            return 'alt-route';
        case NotificationType.ROUTE_OFFER:
            return 'map';
        case NotificationType.ROUTE_STARTED:
            return 'play-arrow';
        case NotificationType.ROUTE_COMPLETED:
            return 'check-circle';
        case NotificationType.SERVICE_ADDED:
            return 'add-circle';
        case NotificationType.SERVICE_REMOVED:
            return 'remove-circle';
        case NotificationType.SERVICE_COMPLETED:
            return 'done';
        case NotificationType.PAYMENT_RECEIVED:
            return 'payments';
        case NotificationType.CHAT_MESSAGE:
            return 'chat';
        case NotificationType.SYSTEM_ALERT:
            return 'notifications';
        default:
            return 'info';
    }
}
