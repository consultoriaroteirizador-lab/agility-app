import type { ChatSendOutcome, OutgoingAttachment } from '../dto/types';

/**
 * Teto de anexos por envio: o mesmo do `FilesInterceptor('files', 5)` do backend.
 * Cada anexo vira UMA mensagem, porque `SendMessageDto` tem um único `attachmentUrl` (contrato C5).
 */
export const MAX_CHAT_ATTACHMENTS = 5;

export interface ChatSendStep {
    content: string;
    attachment?: OutgoingAttachment;
    /** Este passo leva o texto digitado (se falhar, o texto volta para o campo). */
    carriesText: boolean;
}

/** Rótulo que o app já mandava como conteúdo de mensagem só com anexo. */
export function attachmentPlaceholder(a: OutgoingAttachment): string {
    return a.type === 'image' ? 'Imagem' : 'Anexo';
}

/** Teto do `attachmentName` no `SendMessageDto` (`@MaxLength(255)`): acima disso o backend dá 400. */
export const MAX_ATTACHMENT_NAME_LENGTH = 255;

/**
 * Nome original do arquivo, pronto para o payload. Vazio vira `undefined` (o campo é omitido,
 * nunca inventado). Acima do teto, corta o meio e preserva a extensão.
 */
export function normalizeAttachmentName(name: string | null | undefined): string | undefined {
    const trimmed = name?.trim();
    if (!trimmed) return undefined;
    if (trimmed.length <= MAX_ATTACHMENT_NAME_LENGTH) return trimmed;
    const dot = trimmed.lastIndexOf('.');
    const ext = dot > 0 && trimmed.length - dot <= 16 ? trimmed.slice(dot) : '';
    return trimmed.slice(0, MAX_ATTACHMENT_NAME_LENGTH - ext.length) + ext;
}

/**
 * Campos de anexo da mensagem, a partir do anexo escolhido e da chave devolvida pelo `/chats/upload`.
 * `attachmentName` só entra quando o seletor deu um nome.
 */
export function attachmentMessageFields(
    attachment: OutgoingAttachment,
    key: string,
): { attachmentUrl: string; attachmentType: OutgoingAttachment['type']; attachmentName?: string } {
    const attachmentName = normalizeAttachmentName(attachment.name);
    return {
        attachmentUrl: key,
        attachmentType: attachment.type,
        ...(attachmentName ? { attachmentName } : {}),
    };
}

export function planChatSends(text: string, attachments: OutgoingAttachment[]): ChatSendStep[] {
    const trimmed = text.trim();
    if (attachments.length === 0) {
        return trimmed ? [{ content: trimmed, carriesText: true }] : [];
    }
    return attachments.map((attachment, i) => {
        const carriesText = i === 0 && !!trimmed;
        return { content: carriesText ? trimmed : attachmentPlaceholder(attachment), attachment, carriesText };
    });
}

/**
 * Envia em sequência e para no primeiro erro. Devolve só o que não foi enviado:
 * o motorista toca em enviar de novo sem duplicar o que já foi.
 */
export async function runChatSends(
    text: string,
    attachments: OutgoingAttachment[],
    sendStep: (step: ChatSendStep) => Promise<void>,
): Promise<ChatSendOutcome> {
    const steps = planChatSends(text, attachments);
    for (let i = 0; i < steps.length; i++) {
        try {
            await sendStep(steps[i]);
        } catch (error) {
            const rest = steps.slice(i);
            return {
                unsentText: rest.some((s) => s.carriesText) ? text.trim() : '',
                unsentAttachments: rest.flatMap((s) => (s.attachment ? [s.attachment] : [])),
                error,
            };
        }
    }
    return { unsentText: '', unsentAttachments: [] };
}

export function appendAttachments(
    current: OutgoingAttachment[],
    selected: OutgoingAttachment[],
    max: number = MAX_CHAT_ATTACHMENTS,
): { list: OutgoingAttachment[]; truncated: boolean } {
    const merged = [...current, ...selected];
    return { list: merged.slice(0, max), truncated: merged.length > max };
}
