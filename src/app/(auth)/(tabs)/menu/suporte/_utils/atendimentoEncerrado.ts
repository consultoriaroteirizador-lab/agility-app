import type { Ticket } from '@/domain/agility/ticket/dto/types';

// Texto que o back grava no `resolve-by-requester` (`TicketEntity.resolveByRequester`).
const PREFIXO_DO_SOLICITANTE = 'Encerrado pelo solicitante';

/**
 * Aviso de conversa encerrada. Quando a própria motorista encerrou, a tela dizia "finalizado
 * pelo operador" (rodada de 09/10/2026). Quem encerrou vem do protocolo (`resolvedByRequester`,
 * ou o texto gravado pelo back); na mesma tela, o encerramento que ela acabou de confirmar.
 */
export function textoAtendimentoEncerrado(input: {
    encerradoNestaTela: boolean;
    ticket: Pick<Ticket, 'resolvedByRequester' | 'resolutionDescription'> | null | undefined;
}): string {
    const peloSolicitante =
        input.encerradoNestaTela ||
        input.ticket?.resolvedByRequester === true ||
        (input.ticket?.resolutionDescription ?? '').startsWith(PREFIXO_DO_SOLICITANTE);
    return peloSolicitante ? 'Você encerrou este atendimento.' : 'Atendimento finalizado pelo operador.';
}
