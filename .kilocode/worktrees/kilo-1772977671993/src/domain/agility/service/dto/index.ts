// Types and Enums
export * from './types'

// Request DTOs
export type { CreateServiceRequest } from './request/create-service.request'
export type { UpdateServiceRequest } from './request/update-service.request'
export type { ListServicesRequest } from './request/list-services.request'
export type { ChangeServiceStatusRequest } from './request/change-service-status.request'
export type { ServiceCompletionDetailsRequest } from './request/service-completion-details.request'
export type { ServiceClientInfoRequest } from './request/service-client-info.request'
export type { ServiceAddressRequest } from './request/service-address.request'
export type { ServiceDetailsRequest } from './request/service-details.request'
export type { ServiceScheduleRequest } from './request/service-schedule.request'
export type { ServiceMaterialRequest } from './request/service-material.request'
export type { ServiceFailRequest } from './request/service-fail.request'
export { FailureReason } from './request/service-fail.request'
export type { 
    CreateServicesBatchRequest, 
    BatchServiceItemRequest, 
    BatchCreationResult 
} from './request/create-services-batch.request'

// Response DTOs
export type { ServiceResponse } from './response/service.response'


