import { TicketStatus } from '../../dto/types';
import { podeEncerrarComoSolicitante } from '../requesterResolve';

describe('podeEncerrarComoSolicitante', () => {
    it.each([TicketStatus.OPEN, TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS, TicketStatus.TRANSFERRED])(
        'oferece encerrar com o protocolo %s',
        (status) => {
            expect(podeEncerrarComoSolicitante(status, false)).toBe(true);
        },
    );

    it.each([TicketStatus.RESOLVED, TicketStatus.CLOSED])('não oferece com o protocolo %s', (status) => {
        expect(podeEncerrarComoSolicitante(status, false)).toBe(false);
    });

    it('não oferece com o chat fechado: a tela já mostra o aviso de finalizado', () => {
        expect(podeEncerrarComoSolicitante(TicketStatus.IN_PROGRESS, true)).toBe(false);
    });

    it('não oferece enquanto o protocolo não carregou', () => {
        expect(podeEncerrarComoSolicitante(undefined, false)).toBe(false);
    });
});
