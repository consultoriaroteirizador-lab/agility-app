import { routeTitle } from '../routeTitle';

describe('routeTitle — nome, nunca id', () => {
    it('com nome: o nome', () => {
        expect(routeTitle({ name: 'Zona Sul', code: 'LMR-1' })).toBe('Zona Sul');
    });

    it('sem nome: "Rota <código>"', () => {
        expect(routeTitle({ name: null, code: 'LMR-1' })).toBe('Rota LMR-1');
        expect(routeTitle({ name: '  ', code: 'LMR-1' })).toBe('Rota LMR-1');
    });

    it('sem nome nem código: "Rota sem nome", e o id não entra nem se vier junto', () => {
        const rota = { id: '7f3c2a10-0000-4000-8000-abcdef123456', name: null, code: null };
        expect(routeTitle(rota)).toBe('Rota sem nome');
        expect(routeTitle({ name: '', code: ' ' })).toBe('Rota sem nome');
        expect(routeTitle({})).toBe('Rota sem nome');
    });
});
