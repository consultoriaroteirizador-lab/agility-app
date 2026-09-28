import type { OutgoingAttachment } from '../dto/types';

/**
 * Espelho da lista do backend (agility-services `src/chat/constants/chat-attachment.constants.ts`).
 * Fora dela, o `POST /chats/upload` responde 400 "Invalid file type": recusar aqui evita o upload
 * inútil e dá ao motorista uma mensagem que ele entende.
 */
export const CHAT_ATTACHMENT_ALLOWED_MIMES: readonly string[] = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'application/zip',
];

/**
 * Nomes alternativos que o Android (e alguns apps de arquivos) informam para tipos da lista. O
 * backend só conhece o canônico, então o apelido é trocado antes de validar e de montar o multipart.
 */
export const CHAT_ATTACHMENT_MIME_ALIASES: Readonly<Record<string, string>> = {
    'text/comma-separated-values': 'text/csv',
    'text/x-csv': 'text/csv',
    'text/x-comma-separated-values': 'text/csv',
    'application/csv': 'text/csv',
    'application/x-csv': 'text/csv',
    'application/x-zip-compressed': 'application/zip',
    'application/x-zip': 'application/zip',
    'multipart/x-zip': 'application/zip',
};

/**
 * Filtro do seletor "Documentos", derivado da lista acima para não divergir dela. Leva os apelidos
 * porque o Android filtra pelo MIME que o provedor declara: sem eles, um CSV registrado como
 * `text/comma-separated-values` aparece desabilitado. No iOS, MIME sem UTType é ignorado.
 */
export const CHAT_DOCUMENT_PICKER_TYPES: readonly string[] = [
    ...CHAT_ATTACHMENT_ALLOWED_MIMES,
    ...Object.keys(CHAT_ATTACHMENT_MIME_ALIASES),
];

/** Mesmo teto do `limits.fileSize` do `FilesInterceptor` do `/chats/upload`. */
export const MAX_CHAT_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export const UNSUPPORTED_TYPE_MESSAGE =
    'Tipo de arquivo não suportado. Envie imagem (JPG, PNG, WEBP, GIF), PDF, Word, Excel, PowerPoint, TXT, CSV ou ZIP.';
export const TOO_LARGE_MESSAGE = 'Arquivo maior que 10 MB. Escolha um arquivo menor.';

const FALLBACK_MIME = 'application/octet-stream';

const MIME_BY_EXTENSION: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain',
    csv: 'text/csv',
    zip: 'application/zip',
};

const EXTENSION_BY_MIME: Record<string, string> = {
    ...Object.fromEntries(Object.entries(MIME_BY_EXTENSION).map(([ext, mime]) => [mime, ext])),
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
};

/** Extensão em minúsculas do último segmento (sem query/fragmento), ou `undefined`. */
function extensionOf(value: string | null | undefined): string | undefined {
    if (!value) return undefined;
    const path = value.split(/[?#]/)[0];
    const segment = path.slice(path.lastIndexOf('/') + 1);
    const dot = segment.lastIndexOf('.');
    if (dot <= 0 || dot === segment.length - 1) return undefined;
    return segment.slice(dot + 1).toLowerCase();
}

function normalizeMime(mime: string | null | undefined): string | undefined {
    const m = mime?.split(';')[0].trim().toLowerCase();
    if (!m || m === FALLBACK_MIME) return undefined;
    return CHAT_ATTACHMENT_MIME_ALIASES[m] ?? m;
}

export interface AttachmentMimeSource {
    uri: string;
    name?: string | null;
    mimeType?: string | null;
}

/**
 * MIME do arquivo, nesta ordem: o que o seletor informou; a extensão do NOME original; a extensão
 * da URI. No Android a URI do seletor de documentos costuma ser `content://...` sem extensão, então
 * deduzir só pela URI mandava `application/octet-stream` e o backend recusava (400).
 */
export function resolveAttachmentMime(source: AttachmentMimeSource): string {
    const fromPicker = normalizeMime(source.mimeType);
    if (fromPicker) return fromPicker;
    const ext = extensionOf(source.name) ?? extensionOf(source.uri);
    return (ext && MIME_BY_EXTENSION[ext]) || FALLBACK_MIME;
}

/**
 * SEGURANÇA — cópia de `CHAT_ATTACHMENT_EXTENSIONS_BY_MIME` do backend (agility-services
 * `src/chat/constants/chat-attachment.constants.ts`, a fonte da verdade; mudou lá, mude aqui).
 * Extensões aceitas para cada MIME da lista. O arquivo só passa se o MIME estiver na lista E a
 * extensão do nome estiver no conjunto do MIME: `teste.apk` informado como `application/zip`
 * (o Android faz isso) é recusado. Aqui só adianta a mensagem; quem fecha o buraco é o backend.
 */
export const CHAT_ATTACHMENT_EXTENSIONS_BY_MIME: Readonly<Record<string, readonly string[]>> = {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/jpg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/webp': ['webp'],
    'image/gif': ['gif'],
    'application/pdf': ['pdf'],
    'application/msword': ['doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
    // `.csv` com este tipo vira text/csv antes (o Windows registra CSV assim); aqui só sobra o .xls.
    'application/vnd.ms-excel': ['xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
    'application/vnd.ms-powerpoint': ['ppt'],
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['pptx'],
    'text/plain': ['txt'],
    'text/csv': ['csv'],
    'application/zip': ['zip'],
};

/** DOCX/XLSX/PPTX são ZIP por dentro: informados como zip, o nome decide e o tipo vira o do Office. */
const OOXML_MIME_BY_EXTENSION: Readonly<Record<string, string>> = {
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

/**
 * Espelho de `normalizeChatMime` do backend: MIME que o `/chats/upload` vai aceitar, ou `null`.
 * A extensão é a mesma que vai no nome da parte do multipart (a do nome original, senão a da URI).
 * Sem extensão, só imagem passa (câmera/galeria podem não ter nome útil).
 */
export function normalizeChatAttachmentMime(source: AttachmentMimeSource): string | null {
    const ext = extensionOf(source.name) ?? extensionOf(source.uri);
    let mime = resolveAttachmentMime(source);
    if (mime === 'application/vnd.ms-excel' && ext === 'csv') mime = 'text/csv';
    if (mime === 'application/zip' && ext && OOXML_MIME_BY_EXTENSION[ext]) mime = OOXML_MIME_BY_EXTENSION[ext];
    if (!CHAT_ATTACHMENT_ALLOWED_MIMES.includes(mime)) return null;
    if (!ext) return mime.startsWith('image/') ? mime : null;
    return CHAT_ATTACHMENT_EXTENSIONS_BY_MIME[mime].includes(ext) ? mime : null;
}

/** `image/*` vira anexo de imagem (a web renderiza), o resto é documento. */
export function classifyAttachmentMime(mime: string): OutgoingAttachment['type'] {
    return mime.startsWith('image/') ? 'image' : 'document';
}

export interface PickedFile {
    uri: string;
    name?: string | null;
    mimeType?: string | null;
    size?: number | null;
}

/**
 * Anexo a partir de um item de qualquer seletor (câmera, galeria ou documentos). O tipo vem do
 * MIME, não do botão usado: um JPG escolhido em "Documentos" vai como imagem.
 */
export function attachmentFromPicker(file: PickedFile): OutgoingAttachment {
    const mimeType = resolveAttachmentMime(file);
    return {
        uri: file.uri,
        type: classifyAttachmentMime(mimeType),
        mimeType,
        ...(file.name ? { name: file.name } : {}),
        ...(typeof file.size === 'number' ? { size: file.size } : {}),
    };
}

export type AttachmentValidation =
    | { ok: true }
    | { ok: false; reason: 'unsupported' | 'too_large'; message: string };

export function validateChatAttachment(attachment: OutgoingAttachment): AttachmentValidation {
    if (!normalizeChatAttachmentMime(attachment)) {
        return { ok: false, reason: 'unsupported', message: UNSUPPORTED_TYPE_MESSAGE };
    }
    if (typeof attachment.size === 'number' && attachment.size > MAX_CHAT_ATTACHMENT_BYTES) {
        return { ok: false, reason: 'too_large', message: TOO_LARGE_MESSAGE };
    }
    return { ok: true };
}

export interface ChatUploadPart {
    uri: string;
    name: string;
    type: string;
}

/**
 * Parte do multipart do `/chats/upload`. O nome da parte leva a extensão original (do nome, da URI
 * ou, na falta das duas, do MIME). String pura é aceita por compatibilidade com quem só tem a URI.
 */
export function buildChatUploadPart(
    file: string | AttachmentMimeSource,
    index: number,
    platform: string,
    now: number = Date.now(),
): ChatUploadPart {
    const source: AttachmentMimeSource = typeof file === 'string' ? { uri: file } : file;
    const type = normalizeChatAttachmentMime(source) ?? resolveAttachmentMime(source);
    const ext =extensionOf(source.name) ?? extensionOf(source.uri) ?? EXTENSION_BY_MIME[type];
    return {
        uri: platform === 'ios' ? source.uri.replace('file://', '') : source.uri,
        name: `chat-attachment-${now}-${index}${ext ? `.${ext}` : ''}`,
        type,
    };
}

/**
 * Mensagem clara para as recusas do `/chats/upload` que o motorista consegue resolver
 * (tipo e tamanho). Outros erros devolvem `undefined` e seguem o tratamento genérico.
 */
export function chatUploadErrorMessage(error: unknown): string | undefined {
    const response = (error as { response?: { status?: number; data?: { message?: unknown } } } | undefined)
        ?.response;
    if (!response) return undefined;
    const raw = response.data?.message;
    const text = Array.isArray(raw) ? raw.join(' ') : String(raw ?? '');
    if (response.status === 413 || /file too large/i.test(text)) return TOO_LARGE_MESSAGE;
    if (response.status === 400 && /invalid file type/i.test(text)) return UNSUPPORTED_TYPE_MESSAGE;
    return undefined;
}
