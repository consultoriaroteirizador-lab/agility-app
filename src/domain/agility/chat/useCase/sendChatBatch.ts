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
