import { RoutingStatus } from '@/domain/agility/routing/dto/types';

import { motivoDeOfertaEncerrada, ofertaAceitavel } from '../estadoOferta';

const agora = Date.parse('2026-09-11T12:00:00Z');

it('só BROADCASTING dentro do prazo é aceitável', () => {
    expect(ofertaAceitavel({ status: RoutingStatus.BROADCASTING }, agora)).toBe(true);
    expect(ofertaAceitavel({ status: RoutingStatus.BROADCASTING, offerExpiresAt: '2026-09-11T11:00:00Z' }, agora)).toBe(false);
    expect(ofertaAceitavel({ status: RoutingStatus.ASSIGNED }, agora)).toBe(false);
    expect(ofertaAceitavel(null, agora)).toBe(false);
});

it('explica por que a oferta não pode mais ser aceita', () => {
    expect(motivoDeOfertaEncerrada({ status: RoutingStatus.ASSIGNED })).toBe('Esta oferta já foi aceita.');
    expect(motivoDeOfertaEncerrada({ status: RoutingStatus.PENDING_ASSIGNMENT })).toBe('Esta oferta expirou.');
    expect(motivoDeOfertaEncerrada({ status: RoutingStatus.CANCELLED })).toBe('Esta oferta foi cancelada.');
    expect(motivoDeOfertaEncerrada({ status: RoutingStatus.BROADCASTING })).toBeNull();
});
