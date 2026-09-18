import { tituloDaConversa } from '../chatSubject';

describe('tituloDaConversa', () => {
    it('troca os rótulos internos do backend por Suporte', () => {
        expect(tituloDaConversa('Support Request')).toBe('Suporte');
        expect(tituloDaConversa('support request')).toBe('Suporte');
        expect(tituloDaConversa('Customer Support')).toBe('Suporte');
    });

    it('mantém o assunto escrito de verdade', () => {
        expect(tituloDaConversa('Problema na entrega 123')).toBe('Problema na entrega 123');
    });

    it('cai em Suporte quando não há assunto', () => {
        expect(tituloDaConversa(undefined)).toBe('Suporte');
        expect(tituloDaConversa(null)).toBe('Suporte');
        expect(tituloDaConversa('   ')).toBe('Suporte');
    });
});
