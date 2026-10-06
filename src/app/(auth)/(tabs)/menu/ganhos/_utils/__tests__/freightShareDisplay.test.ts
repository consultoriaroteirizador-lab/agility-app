import type { DriverFreightShareResponse } from '@/domain/agility/wallet/dto/response/wallet.response';
import { FreightShareStatus } from '@/domain/agility/wallet/dto/types';

import { describeFreightShare } from '../freightShareDisplay';

const parcela = (over: Partial<DriverFreightShareResponse> = {}): DriverFreightShareResponse => ({
    id: 's-1', routingId: 'r-0000-1111', routingCode: 'LMR-1', routingName: 'Zona Sul', status: FreightShareStatus.A_LIBERAR,
    stopsCompleted: 8, stopsTotal: 10, valueMode: 'TOTAL', fullAmountCents: 20000, amountToReleaseCents: 16000,
    releasedAmountCents: null, releasedAt: null, adjustReason: null, cancelledAt: null, cancelReason: null, createdAt: '2026-10-05T12:00:00.000Z',
    ...over,
});

describe('describeFreightShare', () => {
    it('a liberar: valor bloqueado, paradas e a espera', () => {
        expect(describeFreightShare(parcela())).toEqual({
            route: 'Zona Sul', status: { label: 'A liberar', textColor: 'yellow100', bgColor: 'yellow20' },
            amountCents: 16000, stops: '8 de 10 paradas', note: 'Esperando a empresa liberar', date: null,
        });
    });

    it('liberada com ajuste: valor liberado, data e o motivo da empresa', () => {
        const d = describeFreightShare(parcela({ status: FreightShareStatus.LIBERADA, amountToReleaseCents: 0, releasedAmountCents: 15000, releasedAt: '2026-10-06T12:00:00.000Z', adjustReason: 'atraso na coleta' }));
        expect(d.amountCents).toBe(15000);
        expect(d.note).toBe('Ajuste da empresa: atraso na coleta');
        expect(d.date).toBe('2026-10-06T12:00:00.000Z');
    });

    it('liberada sem ajuste: sem nota', () => {
        expect(describeFreightShare(parcela({ status: FreightShareStatus.LIBERADA, releasedAmountCents: 20000, releasedAt: '2026-10-06T12:00:00.000Z' })).note).toBeNull();
    });

    it('cancelada: sem valor, com o motivo', () => {
        const d = describeFreightShare(parcela({ status: FreightShareStatus.CANCELADA, amountToReleaseCents: 0, cancelReason: 'rota refeita' }));
        expect(d.amountCents).toBeNull();
        expect(d.note).toBe('Cancelado pela empresa: rota refeita');
    });

    it('sem valor: R$ 0 e a redistribuição', () => {
        const d = describeFreightShare(parcela({ status: FreightShareStatus.SEM_VALOR, amountToReleaseCents: 0 }));
        expect(d.amountCents).toBe(0);
        expect(d.note).toBe('Sem valor nesta rota: a empresa redistribuiu o frete');
    });

    it('rota sem nome cai no código; sem os dois, nunca o id', () => {
        expect(describeFreightShare(parcela({ routingName: null })).route).toBe('LMR-1');
        expect(describeFreightShare(parcela({ routingName: null, routingCode: null })).route).toBe('Rota sem nome');
    });

    it('rota sem paradas contadas: sem a linha de paradas', () => {
        expect(describeFreightShare(parcela({ stopsTotal: 0, stopsCompleted: 0 })).stops).toBeNull();
    });
});
