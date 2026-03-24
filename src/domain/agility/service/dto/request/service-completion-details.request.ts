import { PaymentMethodType } from '../types'

/**
 * DTO for service completion details
 */
export interface ServiceCompletionDetailsRequest {
    /** Completion notes - optional */
    notes?: string

    /** Customer signature (base64 or URL) - optional */
    customerSignature?: string

    /** Customer name who received - optional */
    receivedBy?: string

    /** Actual duration in minutes - optional, minimum 0 */
    actualDurationMinutes?: number

    /** Completion date/time - optional */
    completedAt?: string

    /** Photo proof URLs (comma-separated or JSON array) - optional */
    photoProof?: string

    /** Received payment value in cents - required if service.requiresPayment is true */
    receivedValue?: number

    /** Payment method used - required if service.requiresPayment is true */
    paymentMethod?: PaymentMethodType
}



