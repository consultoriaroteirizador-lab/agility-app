import { useQuery } from '@tanstack/react-query';

import { KEY_NOTIFICATIONS } from '@/domain/queryKeys';

import { listUnreadNotificationsService } from '../notificationService';

export function useFindUnreadNotifications(limit?: number, offset?: number) {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: [KEY_NOTIFICATIONS, 'unread', limit, offset],
        queryFn: () => listUnreadNotificationsService(limit, offset),
        retry: false,
    });

    return {
        notifications: data?.result ?? [],
        isLoading,
        isError,
        refetch,
        isRefetching,
        response: data,
    };
}
