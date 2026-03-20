import { useMemo } from 'react';

import { useRouter, Href } from 'expo-router';

import { Box, ScreenBase, Text } from '@/components';
import { ListaDeNotificacoes } from '@/components/NotificationItem/ListaDeNotificacoes';
import type { NotificationResponse } from '@/domain/agility/notification/dto';
import { useFindAllNotifications, useMarkNotificationAsRead } from '@/domain/agility/notification/useCase';


export default function NotificacoesScreen() {
  const router = useRouter();

  const {
    notifications,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useFindAllNotifications({ limit: 100, offset: 0 });

  const { markAsRead } = useMarkNotificationAsRead();

  // Garante que notifications seja sempre um array
  const notificationsList = Array.isArray(notifications) ? notifications : [];

  const naoLidas = useMemo(() => {
    return notificationsList.filter((n) => n.status === 'UNREAD');
  }, [notificationsList]);

  const lidas = useMemo(() => {
    return notificationsList.filter((n) => n.status === 'READ');
  }, [notificationsList]);

  const handleNotificationPress = (notification: NotificationResponse) => {
    try {
      let route: string | null = null;

      // Extrai IDs do metadata (backend envia routingId e serviceId)
      const routingId = notification.metadata?.routingId;
      const serviceId = notification.metadata?.serviceId;

      switch (notification.type) {
        case 'ROUTE_REPLANNED':
        case 'ROUTE_STARTED':
        case 'ROUTE_COMPLETED':
          if (routingId) {
            route = `/rotas-detalhadas/${routingId}`;
          }
          break;

        case 'SERVICE_ADDED':
        case 'SERVICE_REMOVED':
          if (routingId && serviceId) {
            // Navega direto para a parada específica
            route = `/rotas-detalhadas/${routingId}/parada/${serviceId}`;
          } else if (routingId) {
            route = `/rotas-detalhadas/${routingId}`;
          }
          break;

        case 'SERVICE_COMPLETED':
          if (routingId && serviceId) {
            // Navega para a parada específica completada
            route = `/rotas-detalhadas/${routingId}/parada/${serviceId}`;
          } else {
            route = '/(auth)/(tabs)/menu/historico';
          }
          break;

        case 'ROUTE_OFFER':
          if (routingId) {
            route = `/ofertas/${routingId}`;
          } else {
            route = '/ofertas';
          }
          break;

        case 'PAYMENT_RECEIVED':
          route = '/menu/ganhos';
          break;

        case 'SYSTEM_ALERT':
        default:
          if (notification.linkUrl?.startsWith('/')) {
            route = notification.linkUrl;
          }
          break;
      }

      if (route) {
        router.push(route as Href);
      }
    } catch (error) {
      console.error('Erro ao navegar:', error);
    }
  };

  const handleMarkAsRead = (id: string) => {
    markAsRead(id);
  };

  return (
    <ScreenBase title={<Text preset='textTitle' fontWeightPreset='semibold'>Notificação</Text>}>
      {
        naoLidas.length > 0 && (
          <Box
            paddingTop="y12"
            paddingBottom="y16"
            marginBottom="y16"
          >
            <Box flexDirection="row" alignItems="center" justifyContent="center" width="100%">
              {naoLidas.length > 0 && (
                <Box
                  backgroundColor="primary100"
                  paddingHorizontal="x8"
                  paddingVertical="y2"
                  borderRadius="s12"
                  marginLeft="x8"
                >
                  <Text preset="text14" color="white">
                    ({naoLidas.length})
                  </Text>
                </Box>
              )}
            </Box>
          </Box>
        )
      }

      {/* Lista de notificações */}
      <Box flex={1} >
        {/* Seção não lidas */}
        {naoLidas.length > 0 && (
          <Box marginBottom="y24">
            <Text preset="text16" fontWeight="bold" color="colorTextPrimary" marginBottom="y12">
              Não lidas ({naoLidas.length})
            </Text>
            <ListaDeNotificacoes
              notifications={naoLidas}
              isLoading={false}
              isError={false}
              onRefresh={refetch}
              isRefetching={isRefetching}
              onNotificationPress={handleNotificationPress}
              onMarkAsRead={handleMarkAsRead}
            />
          </Box>
        )}

        {/* Seção lidas */}
        {lidas.length > 0 && (
          <Box flex={1}>
            <Text preset="text16" fontWeight="bold" color="colorTextPrimary" marginBottom="y12">
              Lidas
            </Text>
            <ListaDeNotificacoes
              notifications={lidas}
              isLoading={isLoading}
              isError={isError}
              onRefresh={refetch}
              isRefetching={isRefetching}
              onNotificationPress={handleNotificationPress}
              onMarkAsRead={handleMarkAsRead}
            />
          </Box>
        )}

        {/* Loading inicial */}
        {isLoading && notificationsList.length === 0 && (
          <Box flex={1} justifyContent="center" alignItems="center">
            <Text preset="text14" color="mutedElementsColor">
              Carregando notificações...
            </Text>
          </Box>
        )}

        {/* Mensagem vazia */}
        {!isLoading && notificationsList.length === 0 && (
          <Box paddingVertical="y32" alignItems="center" flex={1} justifyContent="center">
            <Text preset="text14" color="mutedElementsColor" textAlign="center">
              Nenhuma notificação disponível.
            </Text>
          </Box>
        )}

        {/* Erro */}
        {isError && (
          <Box paddingVertical="y32" alignItems="center" flex={1} justifyContent="center">
            <Text preset="text14" color="colorTextError" textAlign="center">
              Erro ao carregar notificações. Arraste para baixo para tentar novamente.
            </Text>
          </Box>
        )}
      </Box>
    </ScreenBase>
  );
}