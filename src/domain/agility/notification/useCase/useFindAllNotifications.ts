import { useQuery } from '@tanstack/react-query';

import { KEY_NOTIFICATIONS } from '@/domain/queryKeys';

import type { NotificationResponse } from '../dto';
import { listNotificationsService } from '../notificationService';

interface UseFindAllNotificationsOptions {
  limit?: number;
  offset?: number;
  enabled?: boolean;
}

/** Chave da lista da aba Notificações. O WebSocket e o "marcar todas" escrevem por prefixo (`[KEY_NOTIFICATIONS, 'all']`). */
export function chaveDaListaDeNotificacoes(limit: number, offset: number) {
  return [KEY_NOTIFICATIONS, 'all', limit, offset] as const;
}

export function useFindAllNotifications(options: UseFindAllNotificationsOptions = {}) {
  const { limit = 100, offset = 0, enabled = true } = options;

  const query = useQuery({
    queryKey: chaveDaListaDeNotificacoes(limit, offset),
    queryFn: async () => {
      const response = await listNotificationsService(limit, offset);
      if (!response.success || !response.result) {
        throw new Error(response.error?.message || 'Erro ao buscar notificações');
      }
      return response.result;
    },
    enabled,
    staleTime: 1000 * 60 * 2, // 2 minutos
  });

  return {
    notifications: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  };
}

export type { NotificationResponse };