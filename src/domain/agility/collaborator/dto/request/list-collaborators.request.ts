import type { CollaboratorRole } from '../types'

/**
 * Query parameters for listing collaborators
 */
export interface ListCollaboratorsRequest {
    /** Filter by role - optional */
    role?: CollaboratorRole;

    /** Filter by department - optional */
    department?: string;

    /** Pagination - page number */
    page?: number;

    /** Pagination - items per page */
    limit?: number;
}
