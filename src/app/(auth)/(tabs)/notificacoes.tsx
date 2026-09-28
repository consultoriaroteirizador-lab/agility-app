import { useMemo } from 'react';

import { Box, ScreenBase, Text } from '@/components';
import { CabecalhoDasNotificacoes } from '@/components/NotificationItem/CabecalhoDasNotificacoes';
import { ListaDeNotificacoes } from '@/components/NotificationItem/ListaDeNotificacoes';
import type { NotificationResponse } from '@/domain/agility/notification/dto';
import { resolverDestinoDaNotificacao } from '@/domain/agility/notification/notificationTarget';
import {
  useFindAllNotifications,
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
} from '@/domain/agility/notification/useCase';
import { abrirDestinoDaNotificacao } from '@/services/notification/notificationRoutes';
import { useToastService } from '@/services/Toast/useToast';


export default function NotificacoesScreen() {
  const {
    notifications,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useFindAllNotifications({ limit: 100, offset: 0 });

  const { markAsRead } = useMarkNotificationAsRead();
  const { markAllAsRead, isLoading: marcandoTodas } = useMarkAllNotificationsAsRead();
  const { showToast } = useToastService();

  // Garante que notifications seja sempre um array
  const notificationsList = Array.isArray(notifications) ? notifications : [];

  const naoLidas = useMemo(() => {
    return notificationsList.filter((n) => n.status === 'UNREAD');
  }, [notificationsList]);

  const lidas = useMemo(() => {
    return notificationsList.filter((n) => n.status === 'READ');
  }, [notificationsList]);

  // O destino mora em `resolverDestinoDaNotificacao`, compartilhado com o banner in-app:
  // tocar no item e tocar no banner levam ao mesmo lugar.
  const handleNotificationPress = (notification: NotificationResponse) => {
    try {
      abrirDestinoDaNotificacao(resolverDestinoDaNotificacao(notification));
    } catch (error) {
      console.error('Erro ao navegar:', error);
    }
  };

  const handleMarkAsRead = (id: string) => {
    markAsRead(id);
  };

  // Otimista: a lista e o badge mudam na hora; se o servidor recusar, o hook devolve o estado anterior.
  const handleMarcarTodas = () => {
    markAllAsRead(undefined, {
      onError: () => showToast({ message: 'Não foi possível marcar as notificações como lidas.', type: 'error' }),
    });
  };

  return (
    <ScreenBase title={<Text preset='textTitle' fontWeightPreset='semibold'>Notificações</Text>}>
      {notificationsList.length > 0 && (
        <CabecalhoDasNotificacoes
          naoLidas={naoLidas.length}
          marcando={marcandoTodas}
          onMarcarTodas={handleMarcarTodas}
        />
      )}

      {/* Lista de notificações */}
      <Box flex={1} >
        {/* Seção não lidas */}
        {naoLidas.length > 0 && (
          <Box marginBottom="y24">
            <Text preset="text16" fontWeight="bold" color="colorTextPrimary" marginBottom="y12" accessibilityRole="header">
              Não lidas
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
            <Text preset="text16" fontWeight="bold" color="colorTextPrimary" marginBottom="y12" accessibilityRole="header">
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
