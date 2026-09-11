import { segundosAteExpirar } from '@/domain/agility/offer/offerExpiry';
import { RoutingStatus } from '@/domain/agility/routing/dto/types';

/** A tela aceita só o que o backend aceitaria: em divulgação e dentro do prazo. */
export function ofertaAceitavel(
    routing: { status: RoutingStatus; offerExpiresAt?: string | null } | null,
    agora: number,
): boolean {
    if (!routing || routing.status !== RoutingStatus.BROADCASTING) return false;
    return segundosAteExpirar(routing.offerExpiresAt, agora) !== 0;
}

export function motivoDeOfertaEncerrada(routing: { status: RoutingStatus } | null): string | null {
    if (!routing || routing.status === RoutingStatus.BROADCASTING) return null;
    if (routing.status === RoutingStatus.PENDING_ASSIGNMENT) return 'Esta oferta expirou.';
    if (routing.status === RoutingStatus.CANCELLED) return 'Esta oferta foi cancelada.';
    return 'Esta oferta já foi aceita.';
}
