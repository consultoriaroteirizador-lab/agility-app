export type ChatBodyState = 'loading' | 'error' | 'ready';

/**
 * O que o corpo da conversa mostra. Erro só vira tela de erro quando não há nada
 * para exibir. Com mensagens (inclusive otimistas) e um polling falhando, a conversa
 * continua visível.
 */
export function resolveChatBodyState(input: {
    isLoading: boolean;
    isError: boolean;
    hasMessages: boolean;
}): ChatBodyState {
    if (input.hasMessages) return 'ready';
    if (input.isLoading) return 'loading';
    if (input.isError) return 'error';
    return 'ready';
}
