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

export function motivoDeOfertaEncerrada(
    routing: { status: RoutingStatus; offerExpiresAt?: string | null } | null,
    agora: number,
): string | null {
    if (!routing) return null;
    if (routing.status === RoutingStatus.BROADCASTING) {
        // O cron que muda o status pro backend ainda não rodou, mas o prazo já
        // bateu zero — a tela não pode continuar oferecendo Aceitar como se a
        // oferta seguisse válida.
        return segundosAteExpirar(routing.offerExpiresAt, agora) === 0 ? 'Esta oferta expirou.' : null;
    }
    if (routing.status === RoutingStatus.PENDING_ASSIGNMENT) return 'Esta oferta expirou.';
    if (routing.status === RoutingStatus.CANCELLED) return 'Esta oferta foi cancelada.';
    if (
        routing.status === RoutingStatus.ASSIGNED
        || routing.status === RoutingStatus.IN_PROGRESS
        || routing.status === RoutingStatus.COMPLETED
    ) return 'Esta oferta já foi aceita.';
    // DRAFT, OPTIMIZED ou qualquer status futuro: não passou por nenhum destes
    // motivos conhecidos — "já foi aceita" seria uma afirmação falsa aqui.
    return 'Esta oferta não está mais disponível.';
}
