import type { PaginationQuery } from '@/types/base'

import type { CollaboratorRole } from '../types'

/**
 * Query parameters for listing collaborators
 */
export interface ListCollaboratorsRequest extends PaginationQuery {
    /** Filter by role - optional */
    role?: CollaboratorRole;

    /** Filter by department - optional */
    department?: string;
}

