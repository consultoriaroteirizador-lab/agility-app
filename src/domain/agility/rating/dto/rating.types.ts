// src/domain/agility/rating/dto/rating.types.ts

export interface DriverRating {
    id: string;
    companyId?: string;
    driverId: string;
    serviceId?: string;
    collaboratorId?: string;
    score: number; // 1 to 5
    reason?: RatingReason;
    reasonLabel?: string; // rótulo em PT já enviado pelo back
    comment?: string;
    isAnonymous?: boolean;
    createdAt: string;
    updatedAt?: string;
}

// Espelha LowRatingReason do back (agility-services)
export type RatingReason =
    | 'LATE_DELIVERY'
    | 'POOR_COMMUNICATION'
    | 'ROUGH_HANDLING'
    | 'UNPROFESSIONAL'
    | 'WRONG_DELIVERY'
    | 'DAMAGED_GOODS'
    | 'OTHER';

export interface DriverRatingStats {
    averageScore: number;
    totalRatings: number;
    fiveStarCount: number;
    fourStarCount: number;
    threeStarCount: number;
    twoStarCount: number;
    oneStarCount: number;
    last30DaysAverage: number;
    last30DaysCount: number;
    scoreDistribution: Record<number, number>; // { 5: n, 4: n, ... }
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
