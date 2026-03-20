import { useQuery } from '@tanstack/react-query';

import type { UserSettingsResponse } from '../dto';
import { userSettingsService } from '../userSettingsService';

export function useGetRoutingSettings() {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery<UserSettingsResponse>({
        queryKey: ['user-settings', 'routing'],
        queryFn: () => userSettingsService.getRoutingSettings(),
        retry: false,
    });

    return {
        data,
        isLoading,
        isError,
        refetch,
        isRefetching,
    };
}

