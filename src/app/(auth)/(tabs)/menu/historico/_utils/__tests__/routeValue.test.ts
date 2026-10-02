import { routeValueLabel } from '../routeValue';

describe('routeValueLabel', () => {
    it('rotula o total como valor da ROTA (reais), não como frete do motorista', () => {
        expect(routeValueLabel(500)).toMatch(/^Valor da rota: R\$\s500,00$/);
        expect(routeValueLabel(1234.5)).toMatch(/^Valor da rota: R\$\s1\.234,50$/);
    });

    it('sem valor: R$ 0,00', () => {
        expect(routeValueLabel(null)).toMatch(/^Valor da rota: R\$\s0,00$/);
        expect(routeValueLabel(undefined)).toMatch(/^Valor da rota: R\$\s0,00$/);
    });
});
