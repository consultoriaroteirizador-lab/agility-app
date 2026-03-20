import { useQuery } from '@tanstack/react-query';

import { KEY_NOTIFICATIONS } from '@/domain/queryKeys';

import { getUnreadCountService } from '../notificationService';

interface UseGetUnreadCountOptions {
  enabled?: boolean;
}

export function useGetUnreadCount(options: UseGetUnreadCountOptions = {}) {
  const { enabled = true } = options;

  const query = useQuery({
    queryKey: [KEY_NOTIFICATIONS, 'unread-count'],
    queryFn: async () => {
      const response = await getUnreadCountService();
      if (!response.success || !response.result) {
        throw new Error(response.error?.message || 'Erro ao buscar contagem de notificações');
      }
      return response.result;
    },
    enabled,
    staleTime: 1000 * 60, // 1 minuto
  });

  return {
    unreadCount: query.data?.unreadCount ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}