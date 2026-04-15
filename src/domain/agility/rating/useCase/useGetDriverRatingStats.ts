// src/domain/agility/rating/useCase/useGetDriverRatingStats.ts

import { useQuery } from '@tanstack/react-query';

import { KEY_RATING } from '@/domain/queryKeys';
import { useAuthCredentialsService } from '@/services';

import { ratingAPI } from '../ratingAPI';

export function useGetDriverRatingStats(driverId: string) {
    const { authCredentials } = useAuthCredentialsService();
    const isAuthenticated =
        !!authCredentials?.accessToken && !!authCredentials?.tenantId;

    const { data, isLoading, isError, error, refetch, isRefetching } =
        useQuery({
            queryKey: [KEY_RATING, 'stats', driverId],
            queryFn: () => ratingAPI.getDriverRatingStats(driverId),
            enabled: isAuthenticated && !!driverId,
            staleTime: 1000 * 60 * 2, // 2 minutes
        });

    return {
        stats: data,
        isLoading,
        isError,
        error,
        refetch,
        isRefetching,
    };
}
