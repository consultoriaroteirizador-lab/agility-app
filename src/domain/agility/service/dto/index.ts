// Types and Enums
export * from './types'

// Request DTOs
export type { ListServicesRequest } from './request/list-services.request'
export type { ServiceCompletionDetailsRequest } from './request/service-completion-details.request'
export type { ServiceFailRequest } from './request/service-fail.request'
export { FailureReason } from './request/service-fail.request'
export type { OccurrenceOutcome, ApplyOccurrenceRequest } from './request/apply-occurrence.request'

// Response DTOs
export type { ServiceResponse } from './response/service.response'
export type { DeliveryAttemptResponse } from './response/delivery-attempt.response'
export type { ServiceLine, MaterialStatus, MaterialCheckRequest, MaterialCheckResponse } from './response/service-line.response'

// Draft (in-progress evidence)
export type {
    ServiceDraftData,
    ServiceDraftRecipient,
    ServiceDraftChecklist,
    SaveServiceDraftRequest,
} from './request/service-draft.request'
export type {
    SaveServiceDraftResponse,
    GetServiceDraftResponse,
} from './response/service-draft.response'


