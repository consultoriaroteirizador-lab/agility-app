import { PaymentMethodType } from '../types'

/**
 * Recipient block captured during the delivery flow.
 */
export interface ServiceDraftRecipient {
    tipo?: string
    nome?: string
    tipoDocumento?: string
    numeroDocumento?: string
}

export interface ServiceDraftChecklist {
    documento?: boolean
    foto?: boolean
    signature?: boolean
}

/**
 * Partial in-progress evidence persisted on the backend (Service.draftData)
 * so the driver can resume after a crash or device switch.
 *
 * All fields are optional. Photo/signature fields must be S3/MinIO URLs
 * returned by POST /services/upload-photos. Base64 is rejected server-side.
 */
export interface ServiceDraftData {
    recipient?: ServiceDraftRecipient
    observation?: string
    photoUrls?: string[]
    signatureUrl?: string
    paymentAmountCents?: number
    paymentMethod?: PaymentMethodType
    etapa?: number
    checklist?: ServiceDraftChecklist
    formAnswers?: Record<string, string | string[]>
    failureReason?: string
    failureNotes?: string
    failurePhotos?: string[]

    /** TRANSFER: perna atual do wizard (coleta na origem → entrega no destino). */
    transferLeg?: 'pickup' | 'delivery'
    /** TRANSFER: coleta na origem concluída. */
    pickupDone?: boolean
    /** TRANSFER: evidência da coleta na origem (snapshot), para retomar após crash. */
    pickupEvidence?: {
        receivedBy?: string
        signatureUrl?: string
        photoUrls?: string[]
        notes?: string
    }

    /** ISO string from the client at the moment of save (used server-side only for logging). */
    clientDraftUpdatedAt?: string
}

/**
 * Body of PUT /services/:id/draft.
 */
export interface SaveServiceDraftRequest {
    data: ServiceDraftData
}
