// src/domain/agility/rating/ratingAPI.ts
import { apiAgility } from '@/api/apiConfig';

import { PaginatedRatingsResponse, DriverRatingStats } from './dto';

/**
 * Backend envelopa toda resposta em { success, message, result, error } via
 * ResponseInterceptor global. Esse helper extrai .result (ou cai em response.data
 * se algum endpoint legado retornar sem envelope).
 */
function unwrap<T>(body: any): T {
    if (body && typeof body === 'object' && 'result' in body) {
        return body.result as T;
    }
    return body as T;
}

export const ratingAPI = {
    async getDriverRatings(
        driverId: string,
        page: number = 1,
        limit: number = 10,
    ): Promise<PaginatedRatingsResponse> {
        const response = await apiAgility.get(
            `/ratings/driver/${driverId}`,
            {
                params: { page, limit },
            },
        );
        return unwrap<PaginatedRatingsResponse>(response.data);
    },

    async getDriverRatingStats(driverId: string): Promise<DriverRatingStats> {
        const response = await apiAgility.get(
            `/ratings/driver/${driverId}/stats`,
        );
        return unwrap<DriverRatingStats>(response.data);
    },
};
