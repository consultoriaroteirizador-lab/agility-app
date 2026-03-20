import { useMutation, useQueryClient } from '@tanstack/react-query';

import { KEY_NOTIFICATIONS } from '@/domain/queryKeys';

import { markNotificationAsReadService } from '../notificationService';

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) => markNotificationAsReadService(id),
    onSuccess: () => {
      // Invalida queries de notificações para atualizar a lista
      queryClient.invalidateQueries({ queryKey: [KEY_NOTIFICATIONS] });
    },
  });

  return {
    markAsRead: mutation.mutate,
    markAsReadAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
  };
}