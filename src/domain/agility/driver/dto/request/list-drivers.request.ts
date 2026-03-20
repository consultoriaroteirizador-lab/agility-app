import type { PaginationQuery } from '@/types/base'

/**
 * Query parameters for listing drivers
 */
export interface ListDriversRequest extends PaginationQuery {
    /** Filter by team code - optional */
    teamCode?: string
}

