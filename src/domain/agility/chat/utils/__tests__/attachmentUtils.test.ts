import { isOpenableAttachmentUrl } from '../attachmentUtils';

describe('isOpenableAttachmentUrl', () => {
    it('aceita a URL assinada que o backend devolve', () => {
        expect(isOpenableAttachmentUrl('https://minio.agilitylabs.com.br/chat/emp/a.xlsx?X-Amz=1')).toBe(true);
        expect(isOpenableAttachmentUrl('http://10.0.2.2:9000/chat/emp/a.pdf')).toBe(true);
    });

    it('recusa a chave crua, que ainda não foi assinada', () => {
        expect(isOpenableAttachmentUrl('chat/9d45e24d/chat-abc.xlsx')).toBe(false);
    });

    it('recusa arquivo local e vazio: a bolha em envio não abre nada', () => {
        expect(isOpenableAttachmentUrl('file:///data/user/0/cache/foto.jpg')).toBe(false);
        expect(isOpenableAttachmentUrl('content://media/external/file/42')).toBe(false);
        expect(isOpenableAttachmentUrl('')).toBe(false);
        expect(isOpenableAttachmentUrl(undefined)).toBe(false);
    });

    it('recusa esquema executável', () => {
        expect(isOpenableAttachmentUrl('javascript:alert(1)')).toBe(false);
    });
});
