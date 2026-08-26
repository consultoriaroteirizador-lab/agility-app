import { PaymentMethodType } from '../types'

/**
 * Recipient block captured during the delivery flow.
 */
export interface ServiceDraftRecipient {
    tipo?: string
    nome?: string
    tipoDocumento?: string
    numeroDocumento?: string
    /** Codigo/rotulo da relacao (opcoes da empresa, spec 2026-08-24) — ver RecipientData. */
    relationCode?: string
    relationLabel?: string
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

    /**
     * Campos `*Signed` — presigned URLs derivadas pelo backend (GET draft), SÓ
     * para exibição. As chaves originais (photoUrls/etc.) seguem sendo a fonte de
     * verdade para persistência/submissão. Restaurar usa estes para o `uri` do
     * <Image> (a chave crua não carrega) e a chave para `__s3Url`.
     */
    photoUrlsSigned?: string[]
    signatureUrlSigned?: string
    failurePhotosSigned?: string[]

    /** TRANSFER: perna atual do wizard (coleta na origem → entrega no destino). */
    transferLeg?: 'pickup' | 'delivery'
    /** TRANSFER: coleta na origem concluída. */
    pickupDone?: boolean
    /** TRANSFER: evidência da coleta na origem (snapshot), para retomar após crash. */
    pickupEvidence?: {
        receivedBy?: string
        /** Documento e relacao de quem entregou na origem — mesmos campos da entrega. */
        receivedByDocumentType?: string
        receivedByDocument?: string
        receivedByRelationCode?: string
        receivedByRelationLabel?: string
        signatureUrl?: string
        photoUrls?: string[]
        notes?: string
        /** presigned (exibição) — ver nota em photoUrlsSigned. */
        photoUrlsSigned?: string[]
        signatureUrlSigned?: string
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
