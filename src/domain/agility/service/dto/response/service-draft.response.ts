import { ServiceDraftData } from '../request/service-draft.request'

/**
 * Response of PUT /services/:id/draft.
 */
export interface SaveServiceDraftResponse {
    success: boolean
    /** ISO string stamped by the server when the draft was persisted. */
    draftUpdatedAt: string
}

/**
 * Response of GET /services/:id/draft.
 * `data` and `draftUpdatedAt` are both null when no draft exists.
 */
export interface GetServiceDraftResponse {
    data: ServiceDraftData | null
    draftUpdatedAt: string | null
}
