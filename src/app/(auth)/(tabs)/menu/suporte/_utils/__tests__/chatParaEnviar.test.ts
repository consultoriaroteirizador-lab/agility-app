// O protocolo nasce na primeira mensagem do rascunho, não no toque em "Nova conversa"
// (decisão de 09/10/2026).
import { chatParaEnviar } from '../chatParaEnviar';

it('conversa existente: envia nela, sem criar nada', async () => {
    const criar = jest.fn();
    await expect(chatParaEnviar({ chatId: 'chat-1', rascunho: false, criar })).resolves.toEqual({ chatId: 'chat-1', criado: false });
    expect(criar).not.toHaveBeenCalled();
});

it('rascunho: cria o chat (e o protocolo) no primeiro envio', async () => {
    const criar = jest.fn().mockResolvedValue('chat-novo');
    await expect(chatParaEnviar({ chatId: undefined, rascunho: true, criar })).resolves.toEqual({ chatId: 'chat-novo', criado: true });
    expect(criar).toHaveBeenCalledTimes(1);
});

it('sem conversa e fora do rascunho: não envia', async () => {
    const criar = jest.fn();
    await expect(chatParaEnviar({ chatId: undefined, rascunho: false, criar })).resolves.toBeNull();
    expect(criar).not.toHaveBeenCalled();
});

it('falha ao criar sobe para a tela mostrar o erro', async () => {
    const criar = jest.fn().mockRejectedValue(new Error('SUPPORT_CHAT_NOT_CREATED'));
    await expect(chatParaEnviar({ chatId: undefined, rascunho: true, criar })).rejects.toThrow('SUPPORT_CHAT_NOT_CREATED');
});
