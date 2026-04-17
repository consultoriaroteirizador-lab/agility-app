/**
 * Query parameters for listing drivers
 */
export interface ListDriversRequest {
    /** Filter by team code - optional */
    teamCode?: string

    /** Pagination - page number */
    page?: number

    /** Pagination - items per page */
    limit?: number
}

