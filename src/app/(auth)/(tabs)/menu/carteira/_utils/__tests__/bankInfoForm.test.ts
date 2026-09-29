import { PixKeyType } from '@/domain/agility/wallet/dto/types';

import { BankInfoForm, buildBankInfoPayload, formFromWallet, normalizePixKey, validateBankForm } from '../bankInfoForm';

function form(over: Partial<BankInfoForm> = {}): BankInfoForm {
    return { pixKeyType: null, pixKey: '', bankName: '', bankAgency: '', bankAccount: '', ...over };
}

describe('formFromWallet', () => {
    it('null do back vira campo vazio', () => {
        expect(formFromWallet({ pixKey: null, pixKeyType: null, bankName: null, bankAgency: null, bankAccount: null })).toEqual(form());
    });

    it('carrega o que o back tem', () => {
        expect(formFromWallet({ pixKey: 'a@b.com', pixKeyType: PixKeyType.EMAIL, bankName: 'Banco X', bankAgency: '1', bankAccount: '2' })).toEqual(
            form({ pixKey: 'a@b.com', pixKeyType: PixKeyType.EMAIL, bankName: 'Banco X', bankAgency: '1', bankAccount: '2' }),
        );
    });
});

describe('normalizePixKey', () => {
    it('CPF e CNPJ só com dígitos', () => {
        expect(normalizePixKey(PixKeyType.CPF, ' 123.456.789-00 ')).toBe('12345678900');
        expect(normalizePixKey(PixKeyType.CNPJ, '12.345.678/0001-90')).toBe('12345678000190');
    });

    it('telefone vira +55DDDNÚMERO, com ou sem o +55 digitado', () => {
        expect(normalizePixKey(PixKeyType.PHONE, '(11) 91234-5678')).toBe('+5511912345678');
        expect(normalizePixKey(PixKeyType.PHONE, '+55 11 91234-5678')).toBe('+5511912345678');
    });

    it('e-mail e aleatória em minúsculas, sem espaço', () => {
        expect(normalizePixKey(PixKeyType.EMAIL, ' Motorista@Exemplo.COM ')).toBe('motorista@exemplo.com');
        expect(normalizePixKey(PixKeyType.RANDOM, '8400E8E7-1B9D-4F9B-B7D3-3A5B8D3C1A2B')).toBe('8400e8e7-1b9d-4f9b-b7d3-3a5b8d3c1a2b');
    });
});

describe('validateBankForm', () => {
    it('só PIX vale', () => {
        expect(validateBankForm(form({ pixKeyType: PixKeyType.CPF, pixKey: '12345678900' }))).toBeNull();
    });

    it('só conta (sem PIX) vale — o back aceita (hasBankInfo)', () => {
        expect(validateBankForm(form({ bankName: 'Banco X', bankAgency: '1234', bankAccount: '56789-0' }))).toBeNull();
    });

    it('conta pela metade é recusada', () => {
        expect(validateBankForm(form({ bankName: 'Banco X', bankAgency: '1234' }))).toBe(
            'Preencha banco, agência e conta, ou deixe os três em branco.',
        );
    });

    it('nada preenchido é recusado', () => {
        expect(validateBankForm(form())).toBe('Informe uma chave PIX ou os dados da conta para receber os saques.');
    });

    it('chave PIX inválida devolve a mensagem da validação', () => {
        expect(validateBankForm(form({ pixKeyType: PixKeyType.CPF, pixKey: '123' }))).toBe('CPF deve ter 11 dígitos');
    });
});

describe('buildBankInfoPayload', () => {
    it('campo apagado vai como null (undefined o back ignora)', () => {
        expect(buildBankInfoPayload(form({ pixKeyType: PixKeyType.CPF, pixKey: '123.456.789-00' }))).toEqual({
            pixKeyType: PixKeyType.CPF,
            pixKey: '12345678900',
            bankName: null,
            bankAgency: null,
            bankAccount: null,
        });
    });

    it('chave vazia apaga chave E tipo', () => {
        expect(buildBankInfoPayload(form({ pixKeyType: PixKeyType.CPF, bankName: ' Banco X ', bankAgency: '1234', bankAccount: '56789-0' }))).toEqual({
            pixKeyType: null,
            pixKey: null,
            bankName: 'Banco X',
            bankAgency: '1234',
            bankAccount: '56789-0',
        });
    });

    it('manda sempre os cinco campos, e nenhum outro (forbidNonWhitelisted)', () => {
        expect(Object.keys(buildBankInfoPayload(form())).sort()).toEqual(['bankAccount', 'bankAgency', 'bankName', 'pixKey', 'pixKeyType']);
    });
});
