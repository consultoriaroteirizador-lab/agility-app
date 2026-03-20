import { useMutation, useQueryClient } from '@tanstack/react-query';

import { KEY_NOTIFICATIONS } from '@/domain/queryKeys';
import { useAuthCredentialsService } from '@/services/authCredentials/useAuthCredentialsService';

import { markAllNotificationsAsReadService } from '../notificationService';

export function useMarkAllNotificationsAsRead() {
  const { authCredentials } = useAuthCredentialsService();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      return await markAllNotificationsAsReadService();
    },
    onSuccess: async () => {
      // Invalidate notification queries
      await queryClient.invalidateQueries({ queryKey: [KEY_NOTIFICATIONS, 'all'] });
      await queryClient.invalidateQueries({ queryKey: [KEY_NOTIFICATIONS, 'unread-count'] });
    },
  });

  return {
    markAllAsRead: mutation.mutate,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    reset: mutation.reset,
  };
}
