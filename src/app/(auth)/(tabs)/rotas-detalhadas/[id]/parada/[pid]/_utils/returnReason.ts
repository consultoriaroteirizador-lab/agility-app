/**
 * Rótulo do motivo do retorno no checklist do CD (separado da quantidade). Vazio quando não há.
 * O motivo vem do manifesto (`GET /routings/:id/return-manifest`): FAILED ou o status da linha;
 * SWAPPED desde a fase 3D (o equipamento trocado na parada volta ao CD).
 */
export function returnReasonLabel(reason?: string | null): string {
    switch (String(reason ?? '').toUpperCase()) {
        case 'FAILED': return ' · Falha na entrega';
        case 'PARTIAL': return ' · Entrega parcial';
        case 'MISSING': return ' · Item ausente';
        case 'DAMAGED': return ' · Danificado';
        case 'REFUSED': return ' · Recusado';
        case 'SWAPPED': return ' · Trocado na parada';
        default: return '';
    }
}
