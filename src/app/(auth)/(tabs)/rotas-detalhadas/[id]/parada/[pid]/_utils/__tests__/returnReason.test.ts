import { returnReasonLabel } from '../returnReason';

describe('returnReasonLabel (conferência de retorno no CD)', () => {
    it.each([
        ['FAILED', ' · Falha na entrega'],
        ['PARTIAL', ' · Entrega parcial'],
        ['MISSING', ' · Item ausente'],
        ['DAMAGED', ' · Danificado'],
        ['REFUSED', ' · Recusado'],
        ['SWAPPED', ' · Trocado na parada'],
    ])('%s → "%s"', (reason, label) => {
        expect(returnReasonLabel(reason)).toBe(label);
    });

    it('caixa baixa vale', () => {
        expect(returnReasonLabel('swapped')).toBe(' · Trocado na parada');
    });

    it('sem motivo, ou desconhecido: vazio', () => {
        expect(returnReasonLabel(null)).toBe('');
        expect(returnReasonLabel(undefined)).toBe('');
        expect(returnReasonLabel('OUTRO')).toBe('');
    });
});
