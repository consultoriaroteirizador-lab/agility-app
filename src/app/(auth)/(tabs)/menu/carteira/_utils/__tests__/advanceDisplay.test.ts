import { advanceDueText, advanceOverdueText, advanceTitle } from '../advanceDisplay';

describe('advanceTitle', () => {
    it('dívida de cobrança em dinheiro não mostra o id do serviço', () => {
        const titulo = advanceTitle({ description: 'Dinheiro recebido no service 2f6c1c8e-1111-2222-3333-a1b2c3d4e5f6 — devolução pendente' });
        expect(titulo).toBe('Dinheiro recebido de cliente');
        expect(titulo).not.toContain('2f6c1c8e');
    });

    it('adiantamento do operador mantém a descrição dele', () => {
        expect(advanceTitle({ description: 'Combustível rota Zona Sul' })).toBe('Combustível rota Zona Sul');
    });
});

describe('advanceDueText', () => {
    it('vencimento como dia-calendário (o painel grava meia-noite UTC)', () => {
        expect(advanceDueText({ dueDate: '2026-09-30T00:00:00.000Z' })).toBe('Vence em 30/09/2026');
    });

    // Suíte fixada em America/Sao_Paulo (UTC-3, test/setup-timezone.ts). Um `dueDate` com
    // hora REAL (não meia-noite UTC) não é dia-calendário do painel — é um timestamp de
    // verdade (ex.: derivado de `promisedEndDate` + prazo). O parse de dia-calendário
    // (`formatDateOnly`/`parseCalendarDay`) IGNORA a hora e chuta o dia pelos dígitos
    // `YYYY-MM-DD` crus: 02:30 UTC do dia 01/10 é 21:30 do dia 30/09 no fuso da operação —
    // usar o parse de dia-calendário aqui devolveria 01/10, um dia à frente do certo.
    it('vencimento com hora real (não meia-noite UTC): formata no fuso do device, não no dia-calendário', () => {
        expect(advanceDueText({ dueDate: '2026-10-01T02:30:00.000Z' })).toBe('Vence em 30/09/2026');
    });

    it('sem vencimento', () => {
        expect(advanceDueText({ dueDate: undefined })).toBeNull();
    });
});

describe('advanceOverdueText', () => {
    // "Venceu em <data>" — antes a tela compunha "Vencido — " + advanceDueText().toLowerCase(),
    // que virava "Vencido — vence em 30/09/2026" (repete "vence").
    it('dia-calendário: "Venceu em <data>", sem repetir "vence"', () => {
        const texto = advanceOverdueText({ dueDate: '2026-09-30T00:00:00.000Z' });
        expect(texto).toBe('Venceu em 30/09/2026');
        expect(texto?.toLowerCase()).not.toContain('vence em vence em');
    });

    it('hora real: mesmo ajuste de fuso do advanceDueText', () => {
        expect(advanceOverdueText({ dueDate: '2026-10-01T02:30:00.000Z' })).toBe('Venceu em 30/09/2026');
    });

    it('sem vencimento', () => {
        expect(advanceOverdueText({ dueDate: undefined })).toBeNull();
    });
});
