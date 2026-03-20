import { useMemo } from 'react';

import { useRouter } from 'expo-router';

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
      // Mapeia o tipo de notificação para a rota correspondente no app
      let route: string | null = null;

      switch (notification.type) {
        case 'ROUTE_REPLANNED':
        case 'ROUTE_STARTED':
        case 'ROUTE_COMPLETED':
          // Para rotas, tenta extrair o ID do linkUrl ou usa o referenceId
          if (notification.referenceId) {
            route = `/rotas-detalhadas/${notification.referenceId}`;
          }
          break;

        case 'ROUTE_OFFER':
          // Ofertas de rota
          if (notification.referenceId) {
            route = `/ofertas/${notification.referenceId}`;
          } else {
            route = '/ofertas';
          }
          break;

        case 'SERVICE_COMPLETED':
          // Serviço completo - vai para histórico
          route = '/menu/historico';
          break;

        case 'PAYMENT_RECEIVED':
          // Pagamento recebido - vai para ganhos
          route = '/menu/ganhos';
          break;

        case 'SYSTEM_ALERT':
        default:
          // Alertas do sistema - tenta usar linkUrl se disponível
          if (notification.linkUrl) {
            // Valida se a rota parece válida (começa com /)
            if (notification.linkUrl.startsWith('/')) {
              route = notification.linkUrl;
            }
          }
          break;
      }

      if (route) {
        router.push(route as any);
      } else {
        console.log('Notificação sem rota de destino:', notification);
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
            backgroundColor="redError"
            paddingHorizontal="x16"
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