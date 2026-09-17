import { resolveChatBodyState } from '../chatBodyState';

describe('resolveChatBodyState', () => {
    it('carregando sem nada em cache', () => {
        expect(resolveChatBodyState({ isLoading: true, isError: false, hasMessages: false })).toBe('loading');
    });

    it('falhou e nao tem nada para mostrar: erro, nao "nenhuma mensagem"', () => {
        expect(resolveChatBodyState({ isLoading: false, isError: true, hasMessages: false })).toBe('error');
    });

    it('falhou no polling mas ja tem mensagens: continua mostrando a conversa', () => {
        expect(resolveChatBodyState({ isLoading: false, isError: true, hasMessages: true })).toBe('ready');
    });

    it('carregou vazio: pronto (lista vazia de verdade)', () => {
        expect(resolveChatBodyState({ isLoading: false, isError: false, hasMessages: false })).toBe('ready');
    });
});
