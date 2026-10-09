import { createDriverSupportChatService } from '../chatService';

/** Assunto usado quando o suporte é aberto a partir de um serviço (igual à tela de Suporte). */
export function supportSubjectForService(serviceId: string): string {
    return `Problema no serviço #${serviceId}`;
}

/**
 * Entrada ÚNICA para abrir o suporte. O backend é o dono da regra: devolve o chat
 * ativo com protocolo aberto, ou fecha o antigo (protocolo resolvido/fechado) e cria
 * um novo. Não confiar no `activeChat` do cache: era isso que levava o motorista de
 * volta a uma conversa encerrada (F4).
 */
export async function findOrCreateSupportChatId(params: {
    driverId: string;
    subject?: string;
    serviceId?: string;
}): Promise<string> {
    const res = await createDriverSupportChatService({
        driverId: params.driverId,
        subject: params.subject || undefined,
        serviceId: params.serviceId,
    });
    const id = res?.success ? res.result?.id : undefined;
    if (!id) {
        throw new Error('SUPPORT_CHAT_NOT_CREATED');
    }
    return id;
}

/** Rota da conversa. `returnTo` = tela de origem em outra aba (ver suporte/index.tsx). */
export function supportChatHref(chatId: string, returnTo?: string) {
    return {
        pathname: '/(auth)/(tabs)/menu/suporte/[id]' as const,
        params: returnTo ? { id: chatId, returnTo } : { id: chatId },
    };
}

/** Id da conversa ainda não criada: "Nova conversa" abre aqui e o protocolo nasce no 1º envio. */
const RASCUNHO = 'novo';

export function isRascunhoDeSuporte(id: string | null | undefined): boolean {
    return id === RASCUNHO;
}

/**
 * Rota do rascunho de conversa. Nada é criado no backend até a motorista mandar a primeira
 * mensagem (decisão de 09/10/2026): antes, o toque em "Nova conversa" já abria um protocolo
 * na central, vazio quando o toque era sem querer. Assunto e serviço vão nos params para o
 * find-or-create do primeiro envio.
 */
export function supportDraftHref(params: { subject?: string; serviceId?: string; returnTo?: string }) {
    return {
        pathname: '/(auth)/(tabs)/menu/suporte/[id]' as const,
        params: {
            id: RASCUNHO,
            ...(params.subject ? { assunto: params.subject } : {}),
            ...(params.serviceId ? { servico: params.serviceId } : {}),
            ...(params.returnTo ? { returnTo: params.returnTo } : {}),
        },
    };
}
