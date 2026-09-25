import { uploadChatAttachments } from '../serviceUploadUtils';

const mockPost = jest.fn();
jest.mock('@/api/apiConfig', () => ({
    apiAgility: { post: (...args: unknown[]) => mockPost(...args) },
}));

// Captura as partes que vão no multipart, sem depender do FormData do ambiente.
const appended: { field: string; value: unknown }[] = [];
class FakeFormData {
    append(field: string, value: unknown) {
        appended.push({ field, value });
    }
}

beforeEach(() => {
    appended.length = 0;
    mockPost.mockReset().mockResolvedValue({ status: 201, data: { result: { urls: ['chat/c1/k'] } } });
    (globalThis as any).FormData = FakeFormData;
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(Date, 'now').mockReturnValue(1000);
});

afterEach(() => jest.restoreAllMocks());

describe('uploadChatAttachments', () => {
    it('PDF do Android (content:// sem extensão) sobe como application/pdf com extensão no nome', async () => {
        await uploadChatAttachments(
            [{ uri: 'content://docs/document/1234', name: 'nota.pdf', mimeType: 'application/pdf' }],
            'c1',
        );
        expect(appended).toEqual([
            {
                field: 'files',
                value: expect.objectContaining({ name: 'chat-attachment-1000-0.pdf', type: 'application/pdf' }),
            },
        ]);
    });

    it('JPG escolhido em Documentos sobe como image/jpeg', async () => {
        await uploadChatAttachments([{ uri: 'content://docs/document/9', name: 'foto.jpg', mimeType: 'image/jpeg' }], 'c1');
        expect(appended[0].value).toEqual(expect.objectContaining({ type: 'image/jpeg', name: 'chat-attachment-1000-0.jpg' }));
    });

    it('URI pura ainda funciona e PNG não vira image/jpeg', async () => {
        await uploadChatAttachments(['file:///cache/a.png'], 'c1');
        expect(appended[0].value).toEqual(expect.objectContaining({ type: 'image/png' }));
        expect(mockPost).toHaveBeenCalledWith('/chats/upload', expect.anything(), expect.objectContaining({ params: { chatId: 'c1' } }));
    });
});
