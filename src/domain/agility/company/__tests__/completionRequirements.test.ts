/**
 * `photos.min` precisa de PISO (dado ausente/invalido -> falha fechada) e de
 * TETO (dado excessivo -> nao pode travar o motorista para sempre). O
 * MultiPhotoPicker roda com `maxPhotos={5}` e some com o botao de adicionar
 * quando `photos.length >= maxPhotos` — um `min` acima de 5 seria inalcancavel
 * pela interface.
 */
import { resolveCompletionRequirements } from '../completionRequirements'

function minFor(rawMin: unknown): number {
    return resolveCompletionRequirements({
        service: { photos: { mode: 'REQUIRED', min: rawMin } },
    }).service.photos.min
}

describe('resolveCompletionRequirements — photos.min', () => {
    it('ausente cai no piso (1)', () => {
        expect(
            resolveCompletionRequirements({ service: { photos: { mode: 'REQUIRED' } } }).service.photos.min,
        ).toBe(1)
    })

    it('zero cai no piso (1)', () => {
        expect(minFor(0)).toBe(1)
    })

    it('negativo cai no piso (1)', () => {
        expect(minFor(-3)).toBe(1)
    })

    it('nao inteiro cai no piso (1)', () => {
        expect(minFor(2.5)).toBe(1)
    })

    it('dentro da faixa passa direto', () => {
        expect(minFor(3)).toBe(3)
    })

    it('no teto (5) passa direto', () => {
        expect(minFor(5)).toBe(5)
    })

    it('acima do teto e coagido para 5 (MultiPhotoPicker maxPhotos)', () => {
        expect(minFor(6)).toBe(5)
    })

    it('bem acima do teto tambem coage para 5', () => {
        expect(minFor(99)).toBe(5)
    })
})
