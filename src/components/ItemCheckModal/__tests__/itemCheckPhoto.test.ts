/**
 * Foto do check do item (D-4): DAMAGED exige, REFUSED/PARTIAL aceitam, o resto não tem campo.
 */
import { buildCheckPayload, canConfirm, photoRequirement } from '../itemCheckPhoto';

describe('photoRequirement', () => {
    it.each([
        ['DAMAGED', 'required'],
        ['REFUSED', 'optional'],
        ['PARTIAL', 'optional'],
        ['CHECKED', 'none'],
        ['MISSING', 'none'],
    ] as const)('%s -> %s', (status, esperado) => {
        expect(photoRequirement(status)).toBe(esperado);
    });
});

describe('canConfirm', () => {
    const base = { quantity: 5, actualQuantity: '' };

    it('DAMAGED sem foto não confirma', () => {
        expect(canConfirm({ ...base, status: 'DAMAGED' })).toBe(false);
    });
    it('DAMAGED com foto confirma', () => {
        expect(canConfirm({ ...base, status: 'DAMAGED', photoUrl: 'https://s3/x.jpg' })).toBe(true);
    });
    it('DAMAGED com foto ainda subindo não confirma', () => {
        expect(canConfirm({ ...base, status: 'DAMAGED', photoUrl: 'https://s3/x.jpg', uploading: true })).toBe(false);
    });
    it('REFUSED sem foto confirma', () => {
        expect(canConfirm({ ...base, status: 'REFUSED' })).toBe(true);
    });
    it('PARTIAL sem foto confirma se a quantidade vale; sem quantidade não', () => {
        expect(canConfirm({ ...base, status: 'PARTIAL', actualQuantity: '2' })).toBe(true);
        expect(canConfirm({ ...base, status: 'PARTIAL' })).toBe(false);
    });
    it('quantidade acima do máximo bloqueia em DAMAGED mesmo com foto', () => {
        expect(canConfirm({ ...base, status: 'DAMAGED', actualQuantity: '9', photoUrl: 'u' })).toBe(false);
    });
    it('CHECKED confirma', () => {
        expect(canConfirm({ ...base, status: 'CHECKED' })).toBe(true);
    });
});

describe('buildCheckPayload', () => {
    const base = { quantity: 5, actualQuantity: '', notes: '' };

    it('leva a foto quando o status aceita', () => {
        expect(buildCheckPayload({ ...base, status: 'DAMAGED', photoUrl: 'u' }).photoProof).toBe('u');
        expect(buildCheckPayload({ ...base, status: 'REFUSED', photoUrl: 'u' }).photoProof).toBe('u');
    });
    it('não leva a foto quando o status não aceita (trocou depois de anexar)', () => {
        expect(buildCheckPayload({ ...base, status: 'CHECKED', photoUrl: 'u' })).not.toHaveProperty('photoProof');
        expect(buildCheckPayload({ ...base, status: 'MISSING', photoUrl: 'u' })).not.toHaveProperty('photoProof');
    });
    it('sem foto não manda photoProof', () => {
        expect(buildCheckPayload({ ...base, status: 'REFUSED' })).not.toHaveProperty('photoProof');
    });
    it('mantém quantidade e observações como antes', () => {
        expect(buildCheckPayload({ ...base, status: 'PARTIAL', actualQuantity: '2', notes: ' ok ' })).toEqual({
            status: 'PARTIAL',
            actualQuantity: 2,
            notes: 'ok',
        });
        expect(buildCheckPayload({ ...base, status: 'DAMAGED', actualQuantity: '1', photoUrl: 'u' })).toEqual({
            status: 'DAMAGED',
            actualQuantity: 1,
            photoProof: 'u',
        });
    });
});
