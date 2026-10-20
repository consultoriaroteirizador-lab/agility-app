/**
 * Foto do check do item (D-4): DAMAGED exige, REFUSED/PARTIAL aceitam, o resto não tem campo.
 */
import { acceptUploadResult, buildCheckPayload, canConfirm, photoRequirement, shouldDiscardPhotoOnStatusChange } from '../itemCheckPhoto';

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

describe('acceptUploadResult (corrida do upload)', () => {
    // Mesmo contador do modal: reset e cada troca/remoção de foto incrementam.
    const novo = () => {
        let gen = 0;
        return { bump: () => ++gen, atual: () => gen };
    };

    it('upload velho depois do reset é descartado', () => {
        const g = novo();
        const iniciado = g.bump(); // anexou foto no item A
        g.bump(); // fechou o modal (reset)
        expect(acceptUploadResult(iniciado, g.atual())).toBe(false);
    });
    it('upload velho depois da remoção da foto é descartado', () => {
        const g = novo();
        const iniciado = g.bump();
        g.bump(); // removeu a foto durante o envio
        expect(acceptUploadResult(iniciado, g.atual())).toBe(false);
    });
    it('dois uploads em sequência: só o último vale', () => {
        const g = novo();
        const primeiro = g.bump();
        const segundo = g.bump();
        expect(acceptUploadResult(primeiro, g.atual())).toBe(false);
        expect(acceptUploadResult(segundo, g.atual())).toBe(true);
    });
    it('upload sem nada no meio vale', () => {
        const g = novo();
        expect(acceptUploadResult(g.bump(), g.atual())).toBe(true);
    });
});

describe('shouldDiscardPhotoOnStatusChange', () => {
    it.each([
        ['CHECKED', true],
        ['MISSING', true],
        ['DAMAGED', false],
        ['REFUSED', false],
        ['PARTIAL', false],
    ] as const)('trocar para %s descarta a foto/upload em voo: %s', (status, esperado) => {
        expect(shouldDiscardPhotoOnStatusChange(status)).toBe(esperado);
    });
});
