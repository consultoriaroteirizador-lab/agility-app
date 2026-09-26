import {
    attachmentFromPicker,
    buildChatUploadPart,
    chatUploadErrorMessage,
    CHAT_ATTACHMENT_ALLOWED_MIMES,
    CHAT_ATTACHMENT_MIME_ALIASES,
    CHAT_DOCUMENT_PICKER_TYPES,
    classifyAttachmentMime,
    MAX_CHAT_ATTACHMENT_BYTES,
    resolveAttachmentMime,
    validateChatAttachment,
} from '../chatAttachmentMime';

describe('resolveAttachmentMime', () => {
    it.each([
        // [caso, entrada, MIME esperado]
        [
            'Android: content:// sem extensão, nome nota.pdf, mimeType do seletor',
            { uri: 'content://com.android.providers.downloads.documents/document/1234', name: 'nota.pdf', mimeType: 'application/pdf' },
            'application/pdf',
        ],
        [
            'Android: content:// sem extensão e SEM mimeType: deduz pelo nome original',
            { uri: 'content://media/external/file/99', name: 'nota.pdf' },
            'application/pdf',
        ],
        [
            'JPG escolhido pelo seletor de Documentos',
            { uri: 'file:///data/user/0/app/cache/DocumentPicker/abc.jpg', name: 'foto.jpg', mimeType: 'image/jpeg' },
            'image/jpeg',
        ],
        ['PNG deduzido pelo nome vira image/png, não image/jpeg', { uri: 'content://x/1', name: 'tela.PNG' }, 'image/png'],
        ['webp pela URI', { uri: 'file:///cache/a.webp' }, 'image/webp'],
        ['gif pela URI', { uri: 'file:///cache/a.gif' }, 'image/gif'],
        ['jpeg pela URI', { uri: 'file:///cache/a.jpeg' }, 'image/jpeg'],
        ['docx pelo nome', { uri: 'content://x/2', name: 'contrato.docx' }, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        ['doc pelo nome', { uri: 'content://x/3', name: 'antigo.doc' }, 'application/msword'],
        ['xlsx pelo nome', { uri: 'content://x/4', name: 'planilha.xlsx' }, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        ['xls pelo nome', { uri: 'content://x/5', name: 'planilha.xls' }, 'application/vnd.ms-excel'],
        ['pptx pelo nome', { uri: 'content://x/6', name: 'slides.pptx' }, 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
        ['ppt pelo nome', { uri: 'content://x/7', name: 'slides.ppt' }, 'application/vnd.ms-powerpoint'],
        ['txt pelo nome', { uri: 'content://x/8', name: 'nota.txt' }, 'text/plain'],
        ['csv pelo nome', { uri: 'content://x/9', name: 'dados.csv' }, 'text/csv'],
        ['zip pelo nome', { uri: 'content://x/10', name: 'pacote.zip' }, 'application/zip'],
        [
            'mimeType genérico (octet-stream) cede ao nome',
            { uri: 'content://x/11', name: 'nota.pdf', mimeType: 'application/octet-stream' },
            'application/pdf',
        ],
        ['mimeType com parâmetro e maiúscula é normalizado', { uri: 'content://x/12', mimeType: 'Text/Plain; charset=utf-8' }, 'text/plain'],
        ['o nome vence a URI', { uri: 'file:///cache/tmp.bin.jpg', name: 'nota.pdf' }, 'application/pdf'],
        ['sem mimeType, sem extensão: octet-stream', { uri: 'content://x/13', name: 'arquivo' }, 'application/octet-stream'],
        ['URI com query string não esconde a extensão', { uri: 'file:///cache/a.png?v=2' }, 'image/png'],
    ])('%s', (_caso, input, esperado) => {
        expect(resolveAttachmentMime(input)).toBe(esperado);
    });
});

describe('classifyAttachmentMime', () => {
    it.each([
        ['image/jpeg', 'image'],
        ['image/png', 'image'],
        ['image/heic', 'image'],
        ['application/pdf', 'document'],
        ['text/plain', 'document'],
        ['application/octet-stream', 'document'],
    ])('%s -> %s', (mime, esperado) => {
        expect(classifyAttachmentMime(mime)).toBe(esperado);
    });
});

describe('attachmentFromPicker', () => {
    it('JPG pelo seletor de Documentos vira anexo de IMAGEM com MIME e nome', () => {
        expect(
            attachmentFromPicker({ uri: 'file:///cache/abc.jpg', name: 'foto.jpg', mimeType: 'image/jpeg', size: 2048 }),
        ).toEqual({ uri: 'file:///cache/abc.jpg', type: 'image', mimeType: 'image/jpeg', name: 'foto.jpg', size: 2048 });
    });

    it('PDF do Android (content:// sem extensão) vira documento application/pdf', () => {
        expect(
            attachmentFromPicker({ uri: 'content://docs/document/1234', name: 'nota.pdf', mimeType: 'application/pdf' }),
        ).toEqual({ uri: 'content://docs/document/1234', type: 'document', mimeType: 'application/pdf', name: 'nota.pdf' });
    });

    it('foto da galeria sem nome (Android) mantém o nome ausente, não inventado', () => {
        const a = attachmentFromPicker({ uri: 'file:///cache/ImagePicker/x.jpg', name: null, mimeType: 'image/jpeg' });
        expect(a.type).toBe('image');
        expect(a).not.toHaveProperty('name');
    });
});

describe('validateChatAttachment', () => {
    const base = { uri: 'content://x/1', type: 'document' as const };

    it('aceita todos os MIMEs da lista do backend', () => {
        for (const mimeType of CHAT_ATTACHMENT_ALLOWED_MIMES) {
            expect(validateChatAttachment({ ...base, mimeType })).toEqual({ ok: true });
        }
    });

    it('recusa tipo fora da lista com "Tipo de arquivo não suportado"', () => {
        const r = validateChatAttachment({ ...base, name: 'video.mp4', mimeType: 'video/mp4' });
        expect(r.ok).toBe(false);
        expect(!r.ok && r.reason).toBe('unsupported');
        expect(!r.ok && r.message).toMatch(/Tipo de arquivo não suportado/);
    });

    it('recusa arquivo sem tipo identificável', () => {
        const r = validateChatAttachment({ ...base, name: 'arquivo' });
        expect(!r.ok && r.reason).toBe('unsupported');
    });

    it('deduz o tipo pelo nome quando o anexo não tem mimeType', () => {
        expect(validateChatAttachment({ ...base, name: 'nota.pdf' })).toEqual({ ok: true });
    });

    it('recusa acima de 10 MB e aceita exatamente 10 MB', () => {
        const r = validateChatAttachment({ ...base, mimeType: 'application/pdf', size: MAX_CHAT_ATTACHMENT_BYTES + 1 });
        expect(!r.ok && r.reason).toBe('too_large');
        expect(!r.ok && r.message).toMatch(/10 MB/);
        expect(validateChatAttachment({ ...base, mimeType: 'application/pdf', size: MAX_CHAT_ATTACHMENT_BYTES })).toEqual({ ok: true });
    });

    it('tamanho desconhecido não bloqueia (o backend decide)', () => {
        expect(validateChatAttachment({ ...base, mimeType: 'application/pdf' })).toEqual({ ok: true });
    });
});

describe('buildChatUploadPart', () => {
    it.each([
        [
            'Android content:// sem extensão + nome nota.pdf + application/pdf',
            { uri: 'content://docs/document/1234', name: 'nota.pdf', mimeType: 'application/pdf' },
            'android',
            { uri: 'content://docs/document/1234', name: 'chat-attachment-1000-0.pdf', type: 'application/pdf' },
        ],
        [
            'JPG do seletor de Documentos',
            { uri: 'file:///cache/abc.jpg', name: 'foto.JPG', mimeType: 'image/jpeg' },
            'android',
            { uri: 'file:///cache/abc.jpg', name: 'chat-attachment-1000-0.jpg', type: 'image/jpeg' },
        ],
        [
            'PNG só pela URI mantém image/png',
            { uri: 'file:///cache/a.png' },
            'android',
            { uri: 'file:///cache/a.png', name: 'chat-attachment-1000-0.png', type: 'image/png' },
        ],
        [
            'sem extensão em lugar nenhum: extensão sai do MIME',
            { uri: 'content://x/1', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
            'android',
            { uri: 'content://x/1', name: 'chat-attachment-1000-0.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
        ],
        [
            'iOS remove o file:// da URI',
            { uri: 'file:///var/mobile/a.jpg', mimeType: 'image/jpeg' },
            'ios',
            { uri: '/var/mobile/a.jpg', name: 'chat-attachment-1000-0.jpg', type: 'image/jpeg' },
        ],
        [
            'URI em string pura (chamada antiga) ainda funciona',
            'file:///cache/nota.pdf',
            'android',
            { uri: 'file:///cache/nota.pdf', name: 'chat-attachment-1000-0.pdf', type: 'application/pdf' },
        ],
    ])('%s', (_caso, file, platform, esperado) => {
        expect(buildChatUploadPart(file, 0, platform, 1000)).toEqual(esperado);
    });
});

describe('chatUploadErrorMessage', () => {
    it('400 "Invalid file type" vira "Tipo de arquivo não suportado"', () => {
        const err = { response: { status: 400, data: { message: 'Invalid file type. Allowed: image/jpeg' } } };
        expect(chatUploadErrorMessage(err)).toMatch(/Tipo de arquivo não suportado/);
    });

    it('413 / "File too large" vira mensagem de 10 MB', () => {
        expect(chatUploadErrorMessage({ response: { status: 413, data: { message: 'File too large' } } })).toMatch(/10 MB/);
        expect(chatUploadErrorMessage({ response: { status: 400, data: { message: 'File too large' } } })).toMatch(/10 MB/);
    });

    it('outros erros não são reinterpretados', () => {
        expect(chatUploadErrorMessage({ response: { status: 400, data: { message: ['chat encerrado'] } } })).toBeUndefined();
        expect(chatUploadErrorMessage(new Error('Network Error'))).toBeUndefined();
        expect(chatUploadErrorMessage(undefined)).toBeUndefined();
    });
});

describe('tipos novos do backend (Excel, PowerPoint, TXT, CSV, ZIP)', () => {
    const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const PPTX = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    it.each([
        // [extensão, MIME canônico do backend]
        ['xls', 'application/vnd.ms-excel'],
        ['xlsx', XLSX],
        ['ppt', 'application/vnd.ms-powerpoint'],
        ['pptx', PPTX],
        ['txt', 'text/plain'],
        ['csv', 'text/csv'],
        ['zip', 'application/zip'],
    ])('%s: pelo mimeType e só pelo nome dá %s, aceito e documento', (ext, mime) => {
        const pelaMime = { uri: 'content://docs/document/1', name: `arquivo.${ext}`, mimeType: mime };
        const soNome = { uri: 'content://docs/document/1', name: `arquivo.${ext.toUpperCase()}` };
        for (const file of [pelaMime, soNome]) {
            const attachment = attachmentFromPicker(file);
            expect(attachment.mimeType).toBe(mime);
            expect(attachment.type).toBe('document');
            expect(validateChatAttachment(attachment)).toEqual({ ok: true });
            expect(buildChatUploadPart(file, 0, 'android', 1000)).toEqual({
                uri: 'content://docs/document/1',
                name: `chat-attachment-1000-0.${ext}`,
                type: mime,
            });
        }
    });
});

describe('apelidos de MIME (Android) viram o MIME canônico do backend', () => {
    it.each([
        ['text/comma-separated-values', 'text/csv'],
        ['text/x-csv', 'text/csv'],
        ['text/x-comma-separated-values', 'text/csv'],
        ['application/csv', 'text/csv'],
        ['application/x-csv', 'text/csv'],
        ['application/x-zip-compressed', 'application/zip'],
        ['application/x-zip', 'application/zip'],
        ['multipart/x-zip', 'application/zip'],
    ])('%s -> %s', (alias, canonico) => {
        expect(resolveAttachmentMime({ uri: 'content://x/1', mimeType: alias })).toBe(canonico);
        expect(resolveAttachmentMime({ uri: 'content://x/1', mimeType: `${alias.toUpperCase()}; charset=utf-8` })).toBe(canonico);
        const attachment = attachmentFromPicker({ uri: 'content://x/1', name: 'a', mimeType: alias });
        expect(validateChatAttachment(attachment)).toEqual({ ok: true });
        // O multipart vai com o canônico: é o `file.mimetype` que o backend confere.
        expect(buildChatUploadPart({ uri: 'content://x/1', mimeType: alias }, 0, 'android', 1000).type).toBe(canonico);
    });

    it('todo apelido aponta para um MIME da lista do backend e nenhum apelido está na lista', () => {
        for (const [alias, canonico] of Object.entries(CHAT_ATTACHMENT_MIME_ALIASES)) {
            expect(CHAT_ATTACHMENT_ALLOWED_MIMES).toContain(canonico);
            expect(CHAT_ATTACHMENT_ALLOWED_MIMES).not.toContain(alias);
        }
    });
});

describe('CHAT_DOCUMENT_PICKER_TYPES', () => {
    it('é exatamente a lista do backend mais os apelidos (sem image/* nem */*)', () => {
        expect([...CHAT_DOCUMENT_PICKER_TYPES].sort()).toEqual(
            [...CHAT_ATTACHMENT_ALLOWED_MIMES, ...Object.keys(CHAT_ATTACHMENT_MIME_ALIASES)].sort(),
        );
    });

    it('não repete tipo', () => {
        expect(new Set(CHAT_DOCUMENT_PICKER_TYPES).size).toBe(CHAT_DOCUMENT_PICKER_TYPES.length);
    });

    it('todo tipo oferecido pelo seletor passa na validação', () => {
        for (const mimeType of CHAT_DOCUMENT_PICKER_TYPES) {
            expect(validateChatAttachment({ uri: 'content://x/1', type: 'document', mimeType })).toEqual({ ok: true });
        }
    });
});
