/**
 * `payloadDeAceite` guarda `expectedTotalValue` atrás de `ENVIA_VALOR_ESPERADO`:
 * o backend atual usa `forbidNonWhitelisted: true` e rejeitaria o campo com 400
 * antes de o backend novo (Task 4, outro PR) estar em produção.
 */
import { ENVIA_VALOR_ESPERADO, payloadDeAceite } from '../useAcceptRouting';

describe('ENVIA_VALOR_ESPERADO', () => {
    it('começa desligada — o backend atual ainda não aceita o campo', () => {
        expect(ENVIA_VALOR_ESPERADO).toBe(false);
    });
});

describe('payloadDeAceite', () => {
    it('inclui as coordenadas do motorista', () => {
        const payload = payloadDeAceite({ coords: { latitude: -23.5, longitude: -46.6 } }, 150);
        expect(payload.driverLatitude).toBe(-23.5);
        expect(payload.driverLongitude).toBe(-46.6);
    });

    it('funciona sem localização (usuário sem permissão de GPS)', () => {
        const payload = payloadDeAceite(null, 150);
        expect(payload.driverLatitude).toBeUndefined();
        expect(payload.driverLongitude).toBeUndefined();
    });

    it('omite expectedTotalValue enquanto ENVIA_VALOR_ESPERADO for false', () => {
        const payload = payloadDeAceite({ coords: { latitude: -23.5, longitude: -46.6 } }, 150);
        expect(payload).not.toHaveProperty('expectedTotalValue');
    });

    it('omite expectedTotalValue mesmo sem totalValue', () => {
        const payload = payloadDeAceite({ coords: { latitude: -23.5, longitude: -46.6 } }, null);
        expect(payload).not.toHaveProperty('expectedTotalValue');
    });
});
