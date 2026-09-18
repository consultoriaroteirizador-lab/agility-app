/**
 * Assuntos padrão que o backend grava em inglês quando o chat nasce sem assunto.
 * São rótulos internos, não texto escrito por ninguém — não devem ir para a tela.
 */
const PADROES_DO_BACKEND = ['support request', 'customer support'];

/**
 * Título da conversa de suporte para o motorista.
 *
 * Mostra o assunto de verdade quando existe; troca os padrões em inglês por
 * "Suporte". Chats antigos já estão gravados com o rótulo em inglês, então a
 * troca no backend sozinha não resolveria o que já existe.
 */
export function tituloDaConversa(subject?: string | null): string {
    const limpo = subject?.trim();
    if (!limpo) return 'Suporte';
    return PADROES_DO_BACKEND.includes(limpo.toLowerCase()) ? 'Suporte' : limpo;
}
