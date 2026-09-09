import type { UserCredentials } from '@/services/userAuthInfo/UserAuthInfoType';

import { needsPasswordToActivate, resolveActivationError } from '../biometricActivation';

const contaSemSenha: UserCredentials = {
    username: 'ana@transportadora.com',
    allowsBiometrics: false,
};

const contaComSenha: UserCredentials = {
    username: 'ana@transportadora.com',
    password: 'senhaA',
    allowsBiometrics: false,
};

describe('needsPasswordToActivate', () => {
    it('pede a senha quando a conta reabriu o app sem ela guardada', () => {
        // O caso real: a senha e podada do storage enquanto a digital esta
        // desligada. Sem pedir aqui, gravariamos a preferencia sem senha e a
        // digital nunca seria oferecida.
        expect(needsPasswordToActivate(contaSemSenha)).toBe(true);
    });

    it('nao pede logo apos o login digitado, quando a senha ainda esta em maos', () => {
        expect(needsPasswordToActivate(contaComSenha)).toBe(false);
    });

    it('nao pede no caminho de DESLIGAR a digital', () => {
        // Ja ligada => o toggle esta desligando; nao ha o que confirmar.
        expect(needsPasswordToActivate({ ...contaSemSenha, allowsBiometrics: true })).toBe(false);
        expect(needsPasswordToActivate({ ...contaComSenha, allowsBiometrics: true })).toBe(false);
    });

    it('nao pede sem conta', () => {
        expect(needsPasswordToActivate(null)).toBe(false);
        expect(needsPasswordToActivate(undefined)).toBe(false);
    });
});

describe('resolveActivationError', () => {
    it('trata 401 e 400 como senha incorreta', () => {
        expect(resolveActivationError({ response: { status: 401 } })).toBe('Senha incorreta. Tente de novo.');
        expect(resolveActivationError({ response: { status: 400 } })).toBe('Senha incorreta. Tente de novo.');
    });

    it('NAO chama de senha incorreta o que nao e culpa do que foi digitado', () => {
        // 5xx e queda de rede sao falha nossa/da rede. Rotular como "senha
        // incorreta" faria o motorista trocar uma senha que estava certa.
        expect(resolveActivationError({ response: { status: 500 }, error: { message: 'Erro interno' } })).toBe('Erro interno');
        expect(resolveActivationError({ error: { message: 'Sem conexão' } })).toBe('Sem conexão');
    });

    it('cai numa mensagem generica quando o erro nao diz nada', () => {
        expect(resolveActivationError({})).toBe('Não foi possível confirmar a senha agora. Tente de novo.');
        expect(resolveActivationError(null)).toBe('Não foi possível confirmar a senha agora. Tente de novo.');
        expect(resolveActivationError(undefined)).toBe('Não foi possível confirmar a senha agora. Tente de novo.');
    });
});
