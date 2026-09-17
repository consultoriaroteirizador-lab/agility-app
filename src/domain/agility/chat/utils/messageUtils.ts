import type { ChatMessage } from '../dto/types';
import { MessageStatus, ParticipantType } from '../dto/types';

/**
 * Deduplicate messages by ID
 * Filters out messages that already exist in the existing array
 */
export function deduplicateMessages(
    existing: ChatMessage[],
    incoming: ChatMessage[]
): ChatMessage[] {
    const existingIds = new Set(existing.map((m) => m.id));
    return incoming.filter((msg) => !existingIds.has(msg.id));
}

/**
 * Merge two arrays of messages and sort by createdAt
 * Ensures no duplicates in the result (including within existing array)
 */
export function mergeAndSortMessages(
    existing: ChatMessage[],
    incoming: ChatMessage[]
): ChatMessage[] {
    const messageMap = new Map<string, ChatMessage>();

    for (const msg of existing) {
        const existingMsg = messageMap.get(msg.id);
        if (!existingMsg || (!isOptimisticMessage(msg) && isOptimisticMessage(existingMsg))) {
            messageMap.set(msg.id, msg);
        }
    }

    for (const msg of incoming) {
        const existingMsg = messageMap.get(msg.id);
        if (!existingMsg || (!isOptimisticMessage(msg) && isOptimisticMessage(existingMsg))) {
            messageMap.set(msg.id, msg);
        }
    }

    return Array.from(messageMap.values()).sort(
        (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
}

/**
 * Check if a message is an optimistic (temporary) message
 * Optimistic messages have IDs starting with 'temp-'
 */
export function isOptimisticMessage(message: ChatMessage): boolean {
    return message.id.startsWith('temp-');
}

/**
 * Generate a temporary ID for optimistic messages
 */
export function generateTempId(): string {
    return `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Replace an optimistic message with the real one from the server
 */
export function replaceOptimisticMessage(
    messages: ChatMessage[],
    tempId: string,
    realMessage: ChatMessage
): ChatMessage[] {
    return messages.map((msg) => (msg.id === tempId ? realMessage : msg));
}

/**
 * Remove an optimistic message from the array
 */
export function removeOptimisticMessage(
    messages: ChatMessage[],
    tempId: string
): ChatMessage[] {
    return messages.filter((msg) => msg.id !== tempId);
}

/**
 * Get messages that are not from the current user
 * Useful for counting unread messages
 */
export function getMessagesNotFromSender(
    messages: ChatMessage[],
    senderId: string
): ChatMessage[] {
    return messages.filter((msg) => msg.senderId !== senderId);
}

/**
 * Count unread messages (messages not from sender and not marked as read)
 */
export function countUnreadMessages(
    messages: ChatMessage[],
    currentUserId: string
): number {
    return messages.filter(
        (msg) => msg.senderId !== currentUserId && !msg.readAt
    ).length;
}

/**
 * Format message date for display
 */
export function formatMessageDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const hoje = new Date();
    const ontem = new Date(hoje);
    ontem.setDate(ontem.getDate() - 1);

    if (d.toDateString() === hoje.toDateString()) return 'Hoje';
    if (d.toDateString() === ontem.toDateString()) return 'Ontem';

    return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

/**
 * Format message time for display
 */
export function formatMessageTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Normaliza uma mensagem vinda da API ou do socket.
 * Preserva `senderKeycloakUserId`: sem ele a tela não reconhece a mensagem como própria
 * e a confirmação de bolha otimista nunca casa.
 */
export function toChatMessage(raw: unknown, chatId: string): ChatMessage {
    const m = (raw ?? {}) as Record<string, unknown>;
    return {
        id: String(m.id ?? ''),
        chatId: String(m.chatId ?? chatId),
        senderId: String(m.senderId ?? ''),
        senderKeycloakUserId: m.senderKeycloakUserId ? String(m.senderKeycloakUserId) : undefined,
        senderType: (m.senderType as ParticipantType) || ParticipantType.DRIVER,
        content: String(m.content ?? ''),
        attachmentUrl: m.attachmentUrl ? String(m.attachmentUrl) : undefined,
        attachmentType: m.attachmentType as ChatMessage['attachmentType'],
        status: (m.status as MessageStatus) || MessageStatus.SENT,
        readAt: m.readAt as string | undefined,
        deliveredAt: m.deliveredAt as string | undefined,
        createdAt: String(m.createdAt ?? new Date().toISOString()),
        updatedAt: m.updatedAt as string | undefined,
    };
}

/** Só http(s) é tratado como URL remota. Chave do storage, `file://` e outros esquemas não são. */
export function isRemoteUrl(url: string | null | undefined): boolean {
    return !!url && /^https?:\/\//i.test(url);
}

/**
 * `POST /chats/message` devolve a CHAVE do anexo (não assinada). Para a bolha não
 * quebrar até o próximo refetch, usa a URI local da foto no lugar da chave.
 */
export function withDisplayableAttachment(server: ChatMessage, localUri?: string): ChatMessage {
    if (!localUri || !server.attachmentUrl || isRemoteUrl(server.attachmentUrl)) {
        return server;
    }
    return { ...server, attachmentUrl: localUri };
}

/**
 * Insere/atualiza por id e ordena por data. A versão que chega vence, exceto quando
 * traria uma chave relativa no lugar de uma URL que a tela já consegue exibir.
 */
export function upsertServerMessages(existing: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
    const byId = new Map<string, ChatMessage>();
    for (const m of existing) byId.set(m.id, m);
    for (const m of incoming) {
        const prev = byId.get(m.id);
        const keepPrevAttachment =
            !!prev?.attachmentUrl && !!m.attachmentUrl && !isRemoteUrl(m.attachmentUrl);
        byId.set(m.id, keepPrevAttachment && prev ? { ...m, attachmentUrl: prev.attachmentUrl } : m);
    }
    return Array.from(byId.values()).sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
}

/** Tolerância de relógio aparelho × servidor para confirmar bolha de TEXTO. */
export const OPTIMISTIC_TEXT_WINDOW_MS = 60_000;

/**
 * Bolhas otimistas que o servidor ainda não confirmou.
 *
 * - Texto: mesmo remetente (senderId ou senderKeycloakUserId), mesmo conteúdo e dentro da
 *   janela. Cada mensagem do servidor confirma no máximo UMA bolha.
 * - Anexo: nunca por heurística. Sai só pelo `onSuccess` de `usePostMessage`. Antes, o
 *   primeiro anexo real "confirmava" os seguintes enquanto eles ainda subiam.
 */
export function pendingOptimisticMessages(optimistic: ChatMessage[], server: ChatMessage[]): ChatMessage[] {
    const claimed = new Set<string>();
    const ordered = [...optimistic].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    const pending: ChatMessage[] = [];

    for (const opt of ordered) {
        if (opt.attachmentUrl) {
            pending.push(opt);
            continue;
        }
        const match = server.find((s) => {
            if (claimed.has(s.id) || isOptimisticMessage(s) || s.attachmentUrl) return false;
            const sameSender =
                String(s.senderId) === String(opt.senderId) ||
                (!!s.senderKeycloakUserId && String(s.senderKeycloakUserId) === String(opt.senderId));
            if (!sameSender) return false;
            const diff = Math.abs(new Date(s.createdAt).getTime() - new Date(opt.createdAt).getTime());
            return diff < OPTIMISTIC_TEXT_WINDOW_MS && s.content === opt.content;
        });
        if (match) claimed.add(match.id);
        else pending.push(opt);
    }
    return pending;
}
