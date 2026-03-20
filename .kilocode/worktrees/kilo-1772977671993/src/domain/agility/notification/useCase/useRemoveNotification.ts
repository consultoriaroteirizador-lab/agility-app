import { useMutation, useQueryClient } from '@tanstack/react-query';

import { KEY_NOTIFICATIONS } from '@/domain/queryKeys';
import type { Id } from '@/types/base';

import { removeNotificationService } from '../notificationService';

export function useRemoveNotification() {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (id: Id) => removeNotificationService(id),
        onSuccess: () => {
            // Invalida queries de notificações para atualizar a lista
            queryClient.invalidateQueries({ queryKey: [KEY_NOTIFICATIONS] });
        },
    });

    return {
        remove: mutation.mutate,
        removeAsync: mutation.mutateAsync,
        isLoading: mutation.isPending,
        isError: mutation.isError,
        isSuccess: mutation.isSuccess,
    };
}
