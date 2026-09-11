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
    expect(motivoDeOfertaEncerrada({ status: RoutingStatus.ASSIGNED }, agora)).toBe('Esta oferta já foi aceita.');
    expect(motivoDeOfertaEncerrada({ status: RoutingStatus.PENDING_ASSIGNMENT }, agora)).toBe('Esta oferta expirou.');
    expect(motivoDeOfertaEncerrada({ status: RoutingStatus.CANCELLED }, agora)).toBe('Esta oferta foi cancelada.');
    expect(motivoDeOfertaEncerrada({ status: RoutingStatus.BROADCASTING }, agora)).toBeNull();
});

it('BROADCASTING com o prazo já zerado também conta como encerrada, mesmo antes do cron mudar o status', () => {
    expect(
        motivoDeOfertaEncerrada({ status: RoutingStatus.BROADCASTING, offerExpiresAt: '2026-09-11T11:00:00Z' }, agora),
    ).toBe('Esta oferta expirou.');
});

// ─── Final fix wave M5: "já foi aceita" só para quem foi de fato aceita ──────

it('IN_PROGRESS e COMPLETED também contam como "já foi aceita"', () => {
    expect(motivoDeOfertaEncerrada({ status: RoutingStatus.IN_PROGRESS }, agora)).toBe('Esta oferta já foi aceita.');
    expect(motivoDeOfertaEncerrada({ status: RoutingStatus.COMPLETED }, agora)).toBe('Esta oferta já foi aceita.');
});

it('status anterior à divulgação (DRAFT/OPTIMIZED) não é "já foi aceita"', () => {
    expect(motivoDeOfertaEncerrada({ status: RoutingStatus.DRAFT }, agora)).toBe('Esta oferta não está mais disponível.');
    expect(motivoDeOfertaEncerrada({ status: RoutingStatus.OPTIMIZED }, agora)).toBe('Esta oferta não está mais disponível.');
});
