// src/domain/agility/rating/useCase/useGetDriverRatings.ts

import { useQuery } from '@tanstack/react-query';

import { KEY_RATING } from '@/domain/queryKeys';
import { useAuthCredentialsService } from '@/services';

import { ratingAPI } from '../ratingAPI';

export function useGetDriverRatings(
    driverId: string,
    page: number = 1,
    limit: number = 10,
) {
    const { authCredentials } = useAuthCredentialsService();
    const isAuthenticated =
        !!authCredentials?.accessToken && !!authCredentials?.tenantId;

    const { data, isLoading, isError, error, refetch, isRefetching } =
        useQuery({
            queryKey: [KEY_RATING, 'driver', driverId, page, limit],
            queryFn: () => ratingAPI.getDriverRatings(driverId, page, limit),
            enabled: isAuthenticated && !!driverId,
            staleTime: 1000 * 60 * 2, // 2 minutes
        });

    return {
        ratings: data?.data ?? [],
        meta: data?.meta,
        isLoading,
        isError,
        error,
        refetch,
        isRefetching,
    };
}
