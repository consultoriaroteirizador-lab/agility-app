import { formatDate } from '@/utils/formatDate';

import { PIX_CHANGE_ALERT_DAYS, pixKeyChangeNotice } from '../pixKeyNotice';

const AGORA = new Date('2026-10-01T15:00:00.000Z');
const HA_1H = '2026-10-01T14:00:00.000Z';
const DIA = 24 * 60 * 60 * 1000;

describe('pixKeyChangeNotice', () => {
    it('sem troca registrada: null', () => {
        expect(pixKeyChangeNotice({ pixKey: 'a@b.com', pixKeyChangedAt: null, previousPixKeyMasked: null }, AGORA)).toBeNull();
        expect(pixKeyChangeNotice(undefined, AGORA)).toBeNull();
    });

    it('troca há 1 hora: alerta com a data, a anterior mascarada e o pedido de falar com a central', () => {
        expect(pixKeyChangeNotice({ pixKey: 'nova@exemplo.com', pixKeyChangedAt: HA_1H, previousPixKeyMasked: '*******1234' }, AGORA)).toEqual({
            recent: true,
            title: 'Chave PIX alterada',
            text: `A chave PIX da sua carteira foi alterada em ${formatDate(HA_1H)}. A anterior era *******1234. Se não foi você, fale com a central antes de pedir saque.`,
        });
    });

    it('primeiro cadastro (sem anterior) não diz "alterada"', () => {
        const n = pixKeyChangeNotice({ pixKey: 'nova@exemplo.com', pixKeyChangedAt: HA_1H, previousPixKeyMasked: null }, AGORA);
        expect(n?.title).toBe('Chave PIX cadastrada');
        expect(n?.text).toBe(`A chave PIX da sua carteira foi cadastrada em ${formatDate(HA_1H)}. Se não foi você, fale com a central antes de pedir saque.`);
    });

    it('chave removida', () => {
        const n = pixKeyChangeNotice({ pixKey: null, pixKeyChangedAt: HA_1H, previousPixKeyMasked: '*******1234' }, AGORA);
        expect(n?.title).toBe('Chave PIX removida');
        expect(n?.text).toContain(`foi removida em ${formatDate(HA_1H)}.`);
    });

    it(`passados ${PIX_CHANGE_ALERT_DAYS} dias: sem alerta, só o registro`, () => {
        const quando = new Date(AGORA.getTime() - PIX_CHANGE_ALERT_DAYS * DIA).toISOString();
        const n = pixKeyChangeNotice({ pixKey: 'nova@exemplo.com', pixKeyChangedAt: quando, previousPixKeyMasked: '*******1234' }, AGORA);
        expect(n?.recent).toBe(false);
        expect(n?.text).toBe(`A chave PIX da sua carteira foi alterada em ${formatDate(quando)}. A anterior era *******1234.`);
    });

    it('data inválida: null', () => {
        expect(pixKeyChangeNotice({ pixKey: 'a@b.com', pixKeyChangedAt: 'ontem', previousPixKeyMasked: null }, AGORA)).toBeNull();
    });
});
