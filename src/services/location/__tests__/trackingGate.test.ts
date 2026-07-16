import { shouldTrack, resolveDisplayedAvailability } from '../trackingGate';

describe('shouldTrack', () => {
    it('liga se em rota OU disponível; desliga só quando ambos falsos', () => {
        expect(shouldTrack(false, false)).toBe(false);
        expect(shouldTrack(true, false)).toBe(true);
        expect(shouldTrack(false, true)).toBe(true);
        expect(shouldTrack(true, true)).toBe(true);
    });
});

describe('resolveDisplayedAvailability', () => {
    it('mostra o valor pendente (otimista) enquanto há toggle em voo', () => {
        expect(resolveDisplayedAvailability(false, true)).toBe(true);
        expect(resolveDisplayedAvailability(true, false)).toBe(false);
    });
    it('mostra o valor do servidor quando não há pendência', () => {
        expect(resolveDisplayedAvailability(true, null)).toBe(true);
        expect(resolveDisplayedAvailability(false, null)).toBe(false);
    });
});
