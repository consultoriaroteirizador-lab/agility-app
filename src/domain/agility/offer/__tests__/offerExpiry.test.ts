import { segundosAteExpirar } from '../offerExpiry';

const agora = Date.parse('2026-09-11T12:00:00.000Z');

it('conta os segundos até o instante absoluto', () => {
    expect(segundosAteExpirar('2026-09-11T12:01:30.000Z', agora)).toBe(90);
});
it('instante no passado é 0 (expirou de verdade)', () => {
    expect(segundosAteExpirar('2026-09-11T11:59:00.000Z', agora)).toBe(0);
});
it('ausente ou inválido é null: sem prazo, nunca "Expirada"', () => {
    expect(segundosAteExpirar(null, agora)).toBeNull();
    expect(segundosAteExpirar(undefined, agora)).toBeNull();
    expect(segundosAteExpirar('03:00', agora)).toBeNull();
});
