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

    /** Latitude de onde o serviço foi finalizado (best-effort) */
    latitude?: number

    /** Longitude de onde o serviço foi finalizado (best-effort) */
    longitude?: number

    /** Precisão estimada do GPS em metros (best-effort) */
    accuracy?: number

    /**
     * Evidência da COLETA na origem (TRANSFER) — assinatura/recebedor/fotos do
     * handover em A, capturados na perna 1 e enviados junto na finalização.
     */
    pickupCompletion?: {
        customerSignature?: string
        receivedBy?: string
        photoProof?: string
        notes?: string
        completedAt?: string
    }

    /**
     * Conferência das devoluções na parada de RETORNO — snapshot dos itens
     * conferidos no CD (devoluções/coletas + não entregues).
     */
    returnChecklist?: ReturnChecklistItem[]
}

export interface ReturnChecklistItem {
    material: string
    serviceId: string
    serviceCode?: string | null
    quantity?: number
    unit?: string | null
    origin?: 'PICKUP' | 'UNDELIVERED'
    checked: boolean
    notes?: string
}



