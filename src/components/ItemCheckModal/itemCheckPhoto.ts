export type CheckStatus = 'CHECKED' | 'PARTIAL' | 'MISSING' | 'DAMAGED' | 'REFUSED';

export interface CheckData {
    status: CheckStatus;
    actualQuantity?: number;
    notes?: string;
    photoProof?: string;
}

export type PhotoRequirement = 'required' | 'optional' | 'none';

/** Danificado exige foto; recusado e parcial aceitam; os demais não têm o campo. */
export function photoRequirement(status: CheckStatus): PhotoRequirement {
    if (status === 'DAMAGED') return 'required';
    if (status === 'REFUSED' || status === 'PARTIAL') return 'optional';
    return 'none';
}

interface CanConfirmInput {
    status: CheckStatus;
    /** Quantidade da linha (limite superior da quantidade entregue). */
    quantity: number;
    /** Texto digitado no campo "Quantidade entregue". */
    actualQuantity: string;
    photoUrl?: string;
    uploading?: boolean;
}

/** PARTIAL exige quantidade 1..max; DAMAGED aceita vazia, mas se preenchida fica em 0..max. */
function isQuantityValid({ status, quantity, actualQuantity }: CanConfirmInput): boolean {
    const parsed = parseFloat(actualQuantity);
    const hasQty = !!actualQuantity;
    if (status === 'PARTIAL') return hasQty && parsed > 0 && parsed <= quantity;
    if (status === 'DAMAGED') return !hasQty || (parsed >= 0 && parsed <= quantity);
    return true;
}

export function canConfirm(input: CanConfirmInput): boolean {
    if (input.uploading) return false;
    if (!isQuantityValid(input)) return false;
    if (photoRequirement(input.status) === 'required' && !input.photoUrl) return false;
    return true;
}

interface BuildPayloadInput {
    status: CheckStatus;
    quantity: number;
    actualQuantity: string;
    notes: string;
    photoUrl?: string;
}

export function buildCheckPayload({ status, actualQuantity, notes, photoUrl }: BuildPayloadInput): CheckData {
    const hasQty = !!actualQuantity;
    // Envia actualQuantity quando é PARTIAL, ou DAMAGED com quantidade informada.
    const sendQuantity = status === 'PARTIAL' || (status === 'DAMAGED' && hasQty);
    const sendPhoto = !!photoUrl && photoRequirement(status) !== 'none';
    return {
        status,
        ...(sendQuantity && { actualQuantity: parseFloat(actualQuantity) }),
        ...(notes.trim() && { notes: notes.trim() }),
        ...(sendPhoto && { photoProof: photoUrl }),
    };
}
