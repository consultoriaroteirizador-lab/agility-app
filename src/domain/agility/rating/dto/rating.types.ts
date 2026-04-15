// src/domain/agility/rating/dto/rating.types.ts

export interface DriverRating {
    id: string;
    driverId: string;
    customerId: string;
    customerName?: string;
    score: number; // 1 to 5
    comment?: string;
    reason?: RatingReason;
    createdAt: string;
    updatedAt?: string;
}

export type RatingReason =
    | 'PUNCTUALITY'
    | 'KINDNESS'
    | 'VEHICLE_CONDITION'
    | 'ROUTE_KNOWLEDGE'
    | 'COMMUNICATION'
    | 'SAFETY'
    | 'GENERAL'
    | 'COMPLAINT';

export interface DriverRatingStats {
    driverId: string;
    averageScore: number;
    totalRatings: number;
    distribution: RatingDistribution;
}

export interface RatingDistribution {
    star5: number;
    star4: number;
    star3: number;
    star2: number;
    star1: number;
}

export interface PaginatedRatingsResponse {
    data: DriverRating[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
