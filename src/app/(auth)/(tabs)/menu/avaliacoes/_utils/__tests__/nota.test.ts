// Rodada de 09/10/2026: a média aparecia "5.0 / 5.0", com ponto.
import { notaMedia } from '../nota';

it('média com uma casa e vírgula', () => {
    expect(notaMedia(5)).toBe('5,0');
    expect(notaMedia(4.25)).toBe('4,3');
    expect(notaMedia(0)).toBe('0,0');
});
