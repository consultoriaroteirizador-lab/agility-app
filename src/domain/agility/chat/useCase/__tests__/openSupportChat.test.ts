import {
    findOrCreateSupportChatId,
    isRascunhoDeSuporte,
    supportChatHref,
    supportDraftHref,
    supportSubjectForService,
} from '../openSupportChat';

const mockCreate = jest.fn();
jest.mock('../../chatService', () => ({
    createDriverSupportChatService: (...args: unknown[]) => mockCreate(...args),
}));

beforeEach(() => mockCreate.mockReset());

describe('findOrCreateSupportChatId', () => {
    it('devolve o id do chat que o backend achou ou criou', async () => {
        mockCreate.mockResolvedValue({ success: true, result: { id: 'chat-7' } });
        await expect(
            findOrCreateSupportChatId({ driverId: 'kc-1', subject: 'Problema', serviceId: 'svc-1' }),
        ).resolves.toBe('chat-7');
        expect(mockCreate).toHaveBeenCalledWith({ driverId: 'kc-1', subject: 'Problema', serviceId: 'svc-1' });
    });

    it('assunto vazio nao vai para a API', async () => {
        mockCreate.mockResolvedValue({ success: true, result: { id: 'chat-7' } });
        await findOrCreateSupportChatId({ driverId: 'kc-1', subject: '' });
        expect(mockCreate).toHaveBeenCalledWith({ driverId: 'kc-1', subject: undefined, serviceId: undefined });
    });

    it('resposta sem id vira erro (a tela mostra toast)', async () => {
        mockCreate.mockResolvedValue({ success: false });
        await expect(findOrCreateSupportChatId({ driverId: 'kc-1' })).rejects.toThrow('SUPPORT_CHAT_NOT_CREATED');
    });
});

describe('supportChatHref', () => {
    it('sem returnTo', () => {
        expect(supportChatHref('chat-7')).toEqual({
            pathname: '/(auth)/(tabs)/menu/suporte/[id]',
            params: { id: 'chat-7' },
        });
    });

    it('com returnTo', () => {
        expect(supportChatHref('chat-7', '/rotas-detalhadas/r1/parada/p1/nao-realizado').params).toEqual({
            id: 'chat-7',
            returnTo: '/rotas-detalhadas/r1/parada/p1/nao-realizado',
        });
    });
});

describe('supportSubjectForService', () => {
    it('mesmo formato da tela de Suporte', () => {
        expect(supportSubjectForService('svc-1')).toBe('Problema no serviço #svc-1');
    });
});

// "Nova conversa" não cria o protocolo no toque: abre o rascunho, e o protocolo nasce na
// primeira mensagem (decisão de 09/10/2026; antes um toque sem querer chegava à central).
describe('supportDraftHref', () => {
    it('rascunho leva assunto e serviço, e não chama a API', () => {
        expect(supportDraftHref({ subject: 'Problema no app', serviceId: 'svc-1' })).toEqual({
            pathname: '/(auth)/(tabs)/menu/suporte/[id]',
            params: { id: 'novo', assunto: 'Problema no app', servico: 'svc-1' },
        });
        expect(mockCreate).not.toHaveBeenCalled();
    });

    it('sem assunto nem serviço, só o rascunho; returnTo segue valendo', () => {
        expect(supportDraftHref({})).toEqual({ pathname: '/(auth)/(tabs)/menu/suporte/[id]', params: { id: 'novo' } });
        expect(supportDraftHref({ returnTo: '/rotas' }).params).toEqual({ id: 'novo', returnTo: '/rotas' });
    });

    it('isRascunhoDeSuporte reconhece o id do rascunho', () => {
        expect(isRascunhoDeSuporte('novo')).toBe(true);
        expect(isRascunhoDeSuporte('2c8026ab-105b-44ef-b0b5-8e56af5b40a8')).toBe(false);
        expect(isRascunhoDeSuporte(undefined)).toBe(false);
    });
});
