import { TicketStatus } from '../dto/types';

/** Status em que o solicitante ainda pode encerrar o próprio atendimento. */
const ENCERRAVEIS = [
    TicketStatus.OPEN,
    TicketStatus.ASSIGNED,
    TicketStatus.IN_PROGRESS,
    TicketStatus.TRANSFERRED,
];

/**
 * Diz se o botão "Encerrar atendimento" deve aparecer para o motorista.
 *
 * Encerrar na fila é permitido (o problema pode ter se resolvido sozinho antes de
 * alguém atender). Já resolvido/encerrado não tem o que encerrar, e com o chat
 * fechado a tela mostra o aviso de finalizado com "Novo atendimento".
 */
export function podeEncerrarComoSolicitante(
    status: TicketStatus | undefined,
    chatEstaFechado: boolean,
): boolean {
    if (!status || chatEstaFechado) return false;
    return ENCERRAVEIS.includes(status);
}
