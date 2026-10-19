import { pluralize } from '../plural';

describe('pluralize', () => {
    it('1 usa o singular', () => {
        expect(pluralize(1, 'item', 'itens')).toBe('1 item');
        expect(pluralize(1, 'parada', 'paradas')).toBe('1 parada');
    });
    it('0 e N usam o plural', () => {
        expect(pluralize(0, 'item', 'itens')).toBe('0 itens');
        expect(pluralize(3, 'parada', 'paradas')).toBe('3 paradas');
    });
});
