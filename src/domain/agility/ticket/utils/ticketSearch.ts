import { tituloDaConversa } from '@/domain/agility/chat/utils/chatSubject';

interface TicketBuscavel {
    ticketNumber?: string | null;
    subject?: string | null;
    description?: string | null;
}

/** Minúsculas e sem acento, para "avária" achar "Avaria" e "endereco" achar "Endereço". */
function normalizar(texto: string): string {
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/**
 * Busca da aba Protocolos. Casa número (qualquer trecho), assunto cru, o título que a tela
 * MOSTRA (`tituloDaConversa`: "Support Request" aparece como "Suporte"), descrição e o rótulo
 * de status já traduzido. Sem acento e sem caixa. Busca vazia casa tudo.
 */
export function ticketMatchesSearch(ticket: TicketBuscavel, busca: string, statusLabel?: string): boolean {
    const termo = normalizar(busca.trim());
    if (!termo) return true;
    const campos = [
        ticket.ticketNumber,
        ticket.subject,
        tituloDaConversa(ticket.subject),
        ticket.description,
        statusLabel,
    ];
    return campos.some((campo) => typeof campo === 'string' && normalizar(campo).includes(termo));
}
