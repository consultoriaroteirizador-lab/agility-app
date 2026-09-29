import { PixKeyType } from '@/domain/agility/wallet/dto/types';

import { validatePixKey } from '../validatePix';

describe('validatePixKey', () => {
    it('CPF com ou sem máscara', () => {
        expect(validatePixKey('123.456.789-00', PixKeyType.CPF)).toBeNull();
        expect(validatePixKey('12345678900', PixKeyType.CPF)).toBeNull();
        expect(validatePixKey('1234567890', PixKeyType.CPF)).toBe('CPF deve ter 11 dígitos');
    });

    it('telefone digitado com máscara', () => {
        expect(validatePixKey('(11) 91234-5678', PixKeyType.PHONE)).toBeNull();
    });

    it('telefone já salvo no formato +55DDDNÚMERO (reabrir a tela não pode acusar erro)', () => {
        expect(validatePixKey('+5511912345678', PixKeyType.PHONE)).toBeNull();
        expect(validatePixKey('+551134567890', PixKeyType.PHONE)).toBeNull();
    });

    it('telefone sem DDD é recusado', () => {
        expect(validatePixKey('912345678', PixKeyType.PHONE)).toBe('Telefone deve ter DDD + número (10 ou 11 dígitos)');
    });

    it('e-mail e chave aleatória', () => {
        expect(validatePixKey('motorista@exemplo.com', PixKeyType.EMAIL)).toBeNull();
        expect(validatePixKey('nao-e-email', PixKeyType.EMAIL)).toBe('E-mail inválido');
        expect(validatePixKey('8400e8e7-1b9d-4f9b-b7d3-3a5b8d3c1a2b', PixKeyType.RANDOM)).toBeNull();
    });

    it('chave sem tipo', () => {
        expect(validatePixKey('12345678900', null)).toBe('Selecione o tipo da chave PIX');
    });
});
