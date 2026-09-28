import type { NotificationResponse } from './dto';
import { NotificationStatus } from './dto';

/**
 * Notificação agrupada: o backend mantém UMA linha por chat enquanto houver mensagem não lida.
 * Cada mensagem nova ATUALIZA essa linha (mesmo `id`, `updatedAt` novo, título/texto novos e
 * `data.count` = mensagens não lidas) e reemite o evento `notification` do WebSocket com o mesmo id.
 *
 * Por isso o id sozinho não identifica "uma novidade": a chave é id + momento da última mudança.
 * Backend antigo (sem `updatedAt`) cai no `createdAt` — aí a chave equivale ao id de sempre.
 */
export function momentoDaNotificacao(notificacao: NotificationResponse): string {
    return notificacao.updatedAt ?? notificacao.createdAt;
}

export function chaveDaNotificacao(notificacao: NotificationResponse): string {
    return `${notificacao.id}@${momentoDaNotificacao(notificacao)}`;
}

/**
 * Quantas mensagens a linha agrupada representa. Lê `data.count` (contrato do agrupamento) e,
 * por tolerância, `metadata.count` (o campo JSON que o DTO atual expõe). Só vale de 2 para cima:
 * "(1)" não diz nada que o título já não diga.
 */
export function contagemAgrupada(notificacao: NotificationResponse): number | null {
    const bruto = notificacao as NotificationResponse & { data?: { count?: unknown } };
    const valor = bruto.data?.count ?? notificacao.metadata?.count;
    return typeof valor === 'number' && Number.isInteger(valor) && valor > 1 ? valor : null;
}

/**
 * Título com a contagem, só quando o backend não a pôs no próprio título — evita
 * "3 novas mensagens (3)". Compara o número inteiro (3 não casa com 13).
 */
export function tituloComContagem(notificacao: NotificationResponse): string {
    const titulo = notificacao.title ?? '';
    const contagem = contagemAgrupada(notificacao);
    if (contagem === null) return titulo;
    if (new RegExp(`(^|\\D)${contagem}(\\D|$)`).test(titulo)) return titulo;
    return `${titulo} (${contagem})`;
}

/**
 * Upsert por id: a versão nova substitui a antiga e sobe para o topo (a lista é da mais recente
 * para a mais antiga). O status é o do payload — a linha agrupada volta a ser não lida.
 */
export function upsertNotificacao(
    lista: readonly NotificationResponse[],
    notificacao: NotificationResponse,
): NotificationResponse[] {
    return [notificacao, ...lista.filter((n) => n.id !== notificacao.id)];
}

/**
 * Aplica o evento ao dado de uma query de lista do react-query. Dois formatos convivem:
 * `[KEY_NOTIFICATIONS, 'all', …]` guarda o array cru; `[KEY_NOTIFICATIONS, 'unread', …]` guarda o
 * BaseResponse (`{ result: [] }`). Qualquer outra forma (contagem, cache vazio) passa intacta.
 * Na lista de não lidas, uma notificação que chegou já lida sai da lista.
 */
export function aplicarNoCacheDaLista(dado: unknown, notificacao: NotificationResponse, somenteNaoLidas: boolean): unknown {
    const aplicar = (lista: NotificationResponse[]) =>
        somenteNaoLidas && notificacao.status !== NotificationStatus.UNREAD
            ? lista.filter((n) => n.id !== notificacao.id)
            : upsertNotificacao(lista, notificacao);

    if (Array.isArray(dado)) return aplicar(dado as NotificationResponse[]);
    if (dado && typeof dado === 'object' && Array.isArray((dado as { result?: unknown }).result)) {
        const resposta = dado as { result: NotificationResponse[] };
        return { ...resposta, result: aplicar(resposta.result) };
    }
    return dado;
}
