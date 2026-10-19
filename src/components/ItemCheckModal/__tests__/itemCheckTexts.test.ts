import { getCheckTexts, quantityTitle } from '../itemCheckTexts';

describe('getCheckTexts', () => {
    it('entrega mantém os textos de hoje e as 5 opções', () => {
        const t = getCheckTexts('delivery');
        expect(t.statuses).toEqual(['CHECKED', 'PARTIAL', 'MISSING', 'DAMAGED', 'REFUSED']);
        expect(t.labels.CHECKED).toBe('Entregue');
        expect(t.descriptions.CHECKED).toBe('Item entregue com sucesso');
        expect(t.descriptions.REFUSED).toBe('Cliente recusou o item');
        expect(t.quantityLabel).toBe('Quantidade entregue');
    });

    it('coleta usa rótulos e descrições de recolhimento', () => {
        const t = getCheckTexts('pickup');
        expect(t.statuses).toEqual(['CHECKED', 'PARTIAL', 'MISSING', 'DAMAGED', 'REFUSED']);
        expect(t.labels).toEqual({
            CHECKED: 'Coletado',
            PARTIAL: 'Coleta parcial',
            MISSING: 'Não encontrado',
            DAMAGED: 'Avariado',
            REFUSED: 'Cliente não devolveu',
        });
        expect(t.descriptions).toEqual({
            CHECKED: 'Item recolhido do cliente',
            PARTIAL: 'Recolhido em quantidade menor',
            MISSING: 'Item não estava no cliente',
            DAMAGED: 'Item recolhido com avaria',
            REFUSED: 'Cliente não entregou o item',
        });
        expect(t.quantityLabel).toBe('Quantidade coletada');
    });

    it('saída do service tem 4 opções, sem REFUSED', () => {
        const t = getCheckTexts('equipment');
        expect(t.statuses).toEqual(['CHECKED', 'PARTIAL', 'MISSING', 'DAMAGED']);
        expect(t.labels.CHECKED).toBe('Levei');
        expect(t.labels.PARTIAL).toBe('Levei parcial');
        expect(t.labels.MISSING).toBe('Não levei');
        expect(t.labels.DAMAGED).toBe('Danificado');
        expect(t.descriptions.CHECKED).toBe('Equipamento conferido no veículo');
        expect(t.descriptions.PARTIAL).toBe('Levei menos que o previsto');
        expect(t.descriptions.MISSING).toBe('Equipamento não estava disponível');
        expect(t.descriptions.DAMAGED).toBe('Equipamento com defeito ou avaria');
        expect(t.quantityLabel).toBe('Quantidade levada');
    });
});

describe('quantityTitle', () => {
    it('parcial é obrigatório; avaria é opcional', () => {
        const t = getCheckTexts('pickup');
        expect(quantityTitle(t, true)).toBe('Quantidade coletada:');
        expect(quantityTitle(t, false)).toBe('Quantidade coletada (opcional):');
    });
});
