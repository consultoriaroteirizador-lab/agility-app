/**
 * Mapeamento puro entre o estado do recebedor / evidencia de coleta e o formato
 * persistido no draft (`ServiceDraftData`, backend + AsyncStorage local).
 *
 * Existe para fechar um padrao que ja se repetiu nesta feature (`toJson()`/mapper
 * do backend, mapper da listagem da plataforma, guard do drawer): uma lista
 * explicita de campos "esquece" de incluir um campo novo, em silencio, porque a
 * gravacao e a leitura moram em dois lugares que ninguem testa junto. Isolar a
 * forma aqui — com um teste de ida-e-volta — significa que a proxima mudanca em
 * `RecipientData`/`PickupEvidence` tem UM lugar para atualizar, e um teste que
 * quebra na hora se esquecer.
 */

export interface DraftRecipientInput {
    tipo: string | null
    nome: string
    tipoDocumento: string
    numeroDocumento: string
    relationCode?: string
    relationLabel?: string
}

export interface DraftRecipientPersisted {
    tipo?: string
    nome?: string
    tipoDocumento?: string
    numeroDocumento?: string
    relationCode?: string
    relationLabel?: string
}

/** Estado do recebedor -> forma persistida no draft (autosave). */
export function recipientToDraft(recipient: DraftRecipientInput): DraftRecipientPersisted {
    return {
        tipo: recipient.tipo ?? undefined,
        nome: recipient.nome || undefined,
        tipoDocumento: recipient.tipoDocumento || undefined,
        numeroDocumento: recipient.numeroDocumento || undefined,
        relationCode: recipient.relationCode,
        relationLabel: recipient.relationLabel,
    }
}

/**
 * Ha algum campo do recebedor que valha persistir no draft? Existe porque o
 * autosave (`ParadaContext.tsx`) tinha um `hasContent` escrito a mao
 * (`!!recipient.nome || ...`) que esqueceu `relationCode`/`relationLabel` —
 * quando `recipientType` e a UNICA coisa que a empresa pede (ex.: "Ninguem
 * acompanhou", todo o resto HIDDEN), o motorista so preenche a relacao, e sem
 * isto o draft nunca era gravado. Deriva de `recipientToDraft` para nao
 * repetir a lista de campos pela SETIMA vez.
 */
export function draftHasAnyValue(draft: DraftRecipientPersisted): boolean {
    return Object.values(draft).some((v) => v !== undefined)
}

/** Draft persistido -> estado do recebedor (reidratacao). */
export function draftToRecipient(draft: DraftRecipientPersisted | undefined): DraftRecipientInput {
    return {
        tipo: draft?.tipo ?? null,
        nome: draft?.nome ?? '',
        tipoDocumento: draft?.tipoDocumento ?? 'RG',
        numeroDocumento: draft?.numeroDocumento ?? '',
        relationCode: draft?.relationCode,
        relationLabel: draft?.relationLabel,
    }
}

export interface DraftPickupEvidenceInput {
    receivedBy?: string
    receivedByDocumentType?: string
    receivedByDocument?: string
    receivedByRelationCode?: string
    receivedByRelationLabel?: string
    signatureUrl?: string
    photoUrls: string[]
    notes?: string
}

export interface DraftPickupEvidencePersisted {
    receivedBy?: string
    receivedByDocumentType?: string
    receivedByDocument?: string
    receivedByRelationCode?: string
    receivedByRelationLabel?: string
    signatureUrl?: string
    photoUrls?: string[]
    notes?: string
}

/** Snapshot da evidencia da coleta na origem (TRANSFER) -> forma persistida no draft. */
export function pickupEvidenceToDraft(evidence: DraftPickupEvidenceInput): DraftPickupEvidencePersisted {
    return {
        receivedBy: evidence.receivedBy,
        receivedByDocumentType: evidence.receivedByDocumentType,
        receivedByDocument: evidence.receivedByDocument,
        receivedByRelationCode: evidence.receivedByRelationCode,
        receivedByRelationLabel: evidence.receivedByRelationLabel,
        signatureUrl: evidence.signatureUrl,
        photoUrls: evidence.photoUrls,
        notes: evidence.notes,
    }
}

/** Draft persistido -> snapshot da evidencia da coleta (reidratacao). `undefined` quando o draft nao tem a chave. */
export function draftToPickupEvidence(
    draft: DraftPickupEvidencePersisted | undefined,
): DraftPickupEvidenceInput | undefined {
    if (!draft) return undefined
    return {
        receivedBy: draft.receivedBy,
        receivedByDocumentType: draft.receivedByDocumentType,
        receivedByDocument: draft.receivedByDocument,
        receivedByRelationCode: draft.receivedByRelationCode,
        receivedByRelationLabel: draft.receivedByRelationLabel,
        signatureUrl: draft.signatureUrl,
        photoUrls: draft.photoUrls ?? [],
        notes: draft.notes,
    }
}
