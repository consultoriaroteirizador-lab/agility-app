// src/domain/agility/rating/ratingAPI.ts
import { apiAgility } from '@/api/apiConfig';

import { PaginatedRatingsResponse, DriverRatingStats } from './dto';

export const ratingAPI = {
    async getDriverRatings(
        driverId: string,
        page: number = 1,
        limit: number = 10,
    ): Promise<PaginatedRatingsResponse> {
        const response = await apiAgility.get<PaginatedRatingsResponse>(
            `/ratings/driver/${driverId}`,
            {
                params: { page, limit },
            },
        );
        return response.data;
    },

    async getDriverRatingStats(driverId: string): Promise<DriverRatingStats> {
        const response = await apiAgility.get<DriverRatingStats>(
            `/ratings/driver/${driverId}/stats`,
        );
        return response.data;
    },
};
