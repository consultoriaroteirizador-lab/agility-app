/**
 * Em qual chat a mensagem vai. Conversa existente: nela. Rascunho ("Nova conversa"): cria o chat
 * agora, e com ele o protocolo, que só deve nascer quando a motorista manda algo (decisão de
 * 09/10/2026). Sem conversa e fora do rascunho: não envia (`null`). Falha ao criar sobe.
 */
export async function chatParaEnviar(input: {
    chatId: string | undefined;
    rascunho: boolean;
    criar: () => Promise<string>;
}): Promise<{ chatId: string; criado: boolean } | null> {
    if (input.chatId) return { chatId: input.chatId, criado: false };
    if (!input.rascunho) return null;
    return { chatId: await input.criar(), criado: true };
}
