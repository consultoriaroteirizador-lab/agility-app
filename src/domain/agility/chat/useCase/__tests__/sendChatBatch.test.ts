import type { OutgoingAttachment } from '../../dto/types';
import {
    MAX_ATTACHMENT_NAME_LENGTH,
    appendAttachments,
    attachmentMessageFields,
    normalizeAttachmentName,
    planChatSends,
    runChatSends,
    type ChatSendStep,
} from '../sendChatBatch';

const foto = (n: number): OutgoingAttachment => ({ uri: `file:///foto${n}.jpg`, type: 'image' });
const pdf: OutgoingAttachment = { uri: 'file:///nota.pdf', type: 'document', name: 'nota.pdf' };

describe('planChatSends', () => {
    it('so texto: um passo com o texto', () => {
        expect(planChatSends('  oi  ', [])).toEqual([{ content: 'oi', carriesText: true }]);
    });

    it('sem texto e sem anexo: nada a enviar', () => {
        expect(planChatSends('   ', [])).toEqual([]);
    });

    it('um passo por anexo; o texto vai no primeiro, os outros levam o rotulo', () => {
        expect(planChatSends('avaria', [foto(1), pdf])).toEqual([
            { content: 'avaria', attachment: foto(1), carriesText: true },
            { content: 'Anexo', attachment: pdf, carriesText: false },
        ]);
    });

    it('anexo sem texto leva o rotulo do tipo', () => {
        expect(planChatSends('', [foto(1)])[0]).toEqual({ content: 'Imagem', attachment: foto(1), carriesText: false });
    });
});

describe('runChatSends', () => {
    it('tudo enviado: nada sobra, na ordem', async () => {
        const sent: ChatSendStep[] = [];
        const out = await runChatSends('oi', [foto(1), foto(2)], async (s) => {
            sent.push(s);
        });
        expect(out).toEqual({ unsentText: '', unsentAttachments: [] });
        expect(sent.map((s) => s.attachment?.uri)).toEqual(['file:///foto1.jpg', 'file:///foto2.jpg']);
    });

    it('falha no primeiro: devolve texto e todos os anexos, e para', async () => {
        const send = jest.fn().mockRejectedValue(new Error('rede'));
        const out = await runChatSends('oi', [foto(1), foto(2)], send);
        expect(send).toHaveBeenCalledTimes(1);
        expect(out.unsentText).toBe('oi');
        expect(out.unsentAttachments).toEqual([foto(1), foto(2)]);
        expect(out.error).toEqual(new Error('rede'));
    });

    it('falha no meio: o texto ja foi, sobram so os anexos nao enviados', async () => {
        const send = jest.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('x'));
        const out = await runChatSends('oi', [foto(1), foto(2), foto(3)], send);
        expect(send).toHaveBeenCalledTimes(2);
        expect(out.unsentText).toBe('');
        expect(out.unsentAttachments).toEqual([foto(2), foto(3)]);
    });

    it('so texto que falha: devolve o texto', async () => {
        const out = await runChatSends('oi', [], jest.fn().mockRejectedValue(new Error('x')));
        expect(out).toMatchObject({ unsentText: 'oi', unsentAttachments: [] });
    });
});

describe('attachmentMessageFields', () => {
    it('manda o nome original do anexo junto com a chave e o tipo (completo, sem campo a mais)', () => {
        expect(attachmentMessageFields(pdf, 'chat/k1')).toEqual({
            attachmentUrl: 'chat/k1',
            attachmentType: 'document',
            attachmentName: 'nota.pdf',
        });
    });

    it('sem nome no anexo: omite o campo (nao inventa nome)', () => {
        const out = attachmentMessageFields(foto(1), 'chat/k2');
        expect(out).toEqual({ attachmentUrl: 'chat/k2', attachmentType: 'image' });
        expect(out).not.toHaveProperty('attachmentName');
    });

    it('nome so com espacos: omite o campo', () => {
        expect(attachmentMessageFields({ ...pdf, name: '   ' }, 'k')).not.toHaveProperty('attachmentName');
    });
});

describe('normalizeAttachmentName', () => {
    it('apara espacos', () => {
        expect(normalizeAttachmentName('  nota.pdf ')).toBe('nota.pdf');
    });

    it('vazio ou ausente vira undefined', () => {
        expect(normalizeAttachmentName(undefined)).toBeUndefined();
        expect(normalizeAttachmentName(null)).toBeUndefined();
        expect(normalizeAttachmentName('')).toBeUndefined();
    });

    it('acima de 255 caracteres corta o meio e preserva a extensao (o backend recusa > 255)', () => {
        const longo = `${'a'.repeat(300)}.pdf`;
        const out = normalizeAttachmentName(longo)!;
        expect(out).toHaveLength(MAX_ATTACHMENT_NAME_LENGTH);
        expect(out.endsWith('.pdf')).toBe(true);
    });

    it('exatamente 255 fica intacto', () => {
        const nome = `${'b'.repeat(251)}.pdf`;
        expect(normalizeAttachmentName(nome)).toBe(nome);
    });
});

describe('appendAttachments', () => {
    it('acumula ate o teto e avisa quando corta', () => {
        const atual = [foto(1), foto(2), foto(3), foto(4)];
        expect(appendAttachments(atual, [foto(5), foto(6)])).toEqual({
            list: [foto(1), foto(2), foto(3), foto(4), foto(5)],
            truncated: true,
        });
    });

    it('dentro do teto nao corta', () => {
        expect(appendAttachments([], [foto(1)])).toEqual({ list: [foto(1)], truncated: false });
    });
});
