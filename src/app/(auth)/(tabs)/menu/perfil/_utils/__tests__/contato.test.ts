// Rodada de 09/10/2026: o perfil mostrava "+5512988119699" cru e o CPF sem máscara.
import { cpfParaExibir, telefoneParaExibir, telefoneParaSalvar } from '../contato';

describe('telefoneParaExibir', () => {
    it('tira o +55 e mascara o celular', () => {
        expect(telefoneParaExibir('+5512988119699')).toBe('(12) 98811-9699');
        expect(telefoneParaExibir('5512988119699')).toBe('(12) 98811-9699');
    });

    it('mascara número sem código do país, celular e fixo', () => {
        expect(telefoneParaExibir('12988119699')).toBe('(12) 98811-9699');
        expect(telefoneParaExibir('1233334444')).toBe('(12) 3333-4444');
        expect(telefoneParaExibir('+551233334444')).toBe('(12) 3333-4444');
    });

    it('formato desconhecido passa como veio; vazio vira vazio', () => {
        expect(telefoneParaExibir('+1 415 555 0100')).toBe('+1 415 555 0100');
        expect(telefoneParaExibir('')).toBe('');
        expect(telefoneParaExibir(null)).toBe('');
    });
});

describe('telefoneParaSalvar', () => {
    // O back documenta "+5511999999999"; mostrar sem o 55 não pode apagar o código do país.
    it('número brasileiro volta com +55', () => {
        expect(telefoneParaSalvar('(12) 98811-9699')).toBe('+5512988119699');
        expect(telefoneParaSalvar('(12) 3333-4444')).toBe('+551233334444');
    });

    it('número que já tem o 55 ganha só o +', () => {
        expect(telefoneParaSalvar('5512988119699')).toBe('+5512988119699');
    });

    it('vazio não manda nada; outro formato manda os dígitos, como antes', () => {
        expect(telefoneParaSalvar('')).toBeUndefined();
        expect(telefoneParaSalvar('+1 415 555 0100')).toBe('14155550100');
    });
});

describe('cpfParaExibir', () => {
    it('mascara o CPF', () => {
        expect(cpfParaExibir('12345678909')).toBe('123.456.789-09');
        expect(cpfParaExibir('123.456.789-09')).toBe('123.456.789-09');
    });

    it('outro tamanho passa como veio', () => {
        expect(cpfParaExibir('12345678000199')).toBe('12345678000199');
        expect(cpfParaExibir(undefined)).toBe('');
    });
});
