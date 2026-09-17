import { UserCredentials } from '@/services/userAuthInfo/UserAuthInfoType';

import { isBiometricPendingNextLogin, resolveCredentialsToSave, shouldPromptBiometric } from '../accountBiometrics';

const contaA: UserCredentials = {
  username: 'ana@transportadora.com',
  password: 'senhaA',
  name: 'Ana',
  alias: 'aninha',
  allowsBiometrics: true,
};

const contaB: UserCredentials = {
  username: 'bruno@transportadora.com',
  password: 'senhaB',
  name: 'Bruno',
  allowsBiometrics: false,
};

describe('resolveCredentialsToSave — preferencia de biometria por conta', () => {
  it('nao herda a biometria da conta anterior quando entra uma conta nova', () => {
    // Ana (biometria ativa) estava logada e o motorista adiciona a conta do Carlos.
    const saved = resolveCredentialsToSave({
      username: 'carlos@transportadora.com',
      password: 'senhaC',
      savedList: [contaA],
      profileName: 'Carlos',
      profileAlias: null,
    });

    expect(saved.username).toBe('carlos@transportadora.com');
    // undefined = ainda nao decidiu -> o _layout leva para a tela de escolha.
    expect(saved.allowsBiometrics).toBeUndefined();
    expect(saved.name).toBe('Carlos');
    expect(saved.alias).toBe('');
  });

  it('mantem a preferencia da propria conta ao trocar para uma conta ja salva', () => {
    const saved = resolveCredentialsToSave({
      username: contaB.username,
      password: 'senhaB',
      savedList: [contaA, contaB],
      profileName: null,
      profileAlias: null,
    });

    expect(saved.allowsBiometrics).toBe(false);
    // Sem nome vindo do profile, cai no nome da propria conta — nunca no da outra.
    expect(saved.name).toBe('Bruno');
  });

  it('preserva a biometria ativa da conta que esta entrando', () => {
    const saved = resolveCredentialsToSave({
      username: contaA.username,
      password: 'senhaA',
      savedList: [contaA, contaB],
      profileName: 'Ana Silva',
      profileAlias: 'ana',
    });

    expect(saved.allowsBiometrics).toBe(true);
    expect(saved.name).toBe('Ana Silva');
    expect(saved.alias).toBe('ana');
  });

  it('casa o usuario ignorando caixa e espacos', () => {
    const saved = resolveCredentialsToSave({
      username: '  ANA@Transportadora.com ',
      password: 'senhaA',
      savedList: [contaA],
      profileName: null,
      profileAlias: null,
    });

    expect(saved.allowsBiometrics).toBe(true);
  });

  it('trata lista vazia ou nula como primeiro login', () => {
    expect(
      resolveCredentialsToSave({
        username: 'novo@transportadora.com',
        password: 'x',
        savedList: null,
        profileName: 'Novo',
        profileAlias: null,
      }).allowsBiometrics,
    ).toBeUndefined();
  });
});

describe('shouldPromptBiometric — oferta da digital', () => {
  const base = {
    isLoadingCredentials: false,
    deviceId: 'device-1',
    current: contaA,
    attemptedFor: null as string | null,
  };

  it('oferece a digital para a conta atual quando ela permite', () => {
    expect(shouldPromptBiometric(base)).toBe(true);
  });

  it('nao repete o prompt para a mesma conta', () => {
    expect(shouldPromptBiometric({ ...base, attemptedFor: contaA.username })).toBe(false);
  });

  it('volta a oferecer ao trocar de conta (a tentativa anterior era de outro usuario)', () => {
    const contaCComBiometria = { ...contaB, allowsBiometrics: true };
    expect(
      shouldPromptBiometric({
        ...base,
        current: contaCComBiometria,
        attemptedFor: contaA.username,
      }),
    ).toBe(true);
  });

  it('nao oferece para conta que desativou a biometria', () => {
    expect(shouldPromptBiometric({ ...base, current: contaB })).toBe(false);
  });

  it('nao oferece para conta que ainda nao decidiu', () => {
    const semDecisao = { ...contaA, allowsBiometrics: undefined };
    expect(shouldPromptBiometric({ ...base, current: semDecisao })).toBe(false);
  });

  it('nao oferece sem senha salva, sem deviceId ou durante o carregamento', () => {
    expect(shouldPromptBiometric({ ...base, current: { ...contaA, password: undefined } })).toBe(false);
    expect(shouldPromptBiometric({ ...base, deviceId: null })).toBe(false);
    expect(shouldPromptBiometric({ ...base, isLoadingCredentials: true })).toBe(false);
    expect(shouldPromptBiometric({ ...base, current: null })).toBe(false);
  });
});

describe('isBiometricPendingNextLogin', () => {
  it('acusa pendencia quando a conta ligou a digital mas nao tem senha guardada', () => {
    // O caso real: a senha e podada do storage enquanto a biometria esta
    // desligada, entao ao REABRIR o app a conta chega sem ela. Ligar o toggle
    // nesse momento grava so a preferencia — e antes disto a tela dizia
    // "Ativado" e a digital nunca era oferecida, sem explicacao.
    expect(isBiometricPendingNextLogin({ ...contaA, password: undefined })).toBe(true);
  });

  it('nao acusa pendencia quando a senha esta guardada', () => {
    expect(isBiometricPendingNextLogin(contaA)).toBe(false);
  });

  it('nao acusa pendencia para conta com a digital desligada ou indecisa', () => {
    expect(isBiometricPendingNextLogin({ ...contaA, allowsBiometrics: false, password: undefined })).toBe(false);
    expect(isBiometricPendingNextLogin({ ...contaA, allowsBiometrics: undefined, password: undefined })).toBe(false);
  });

  it('nao acusa pendencia sem conta', () => {
    expect(isBiometricPendingNextLogin(null)).toBe(false);
    expect(isBiometricPendingNextLogin(undefined)).toBe(false);
  });

  it('e o complemento exato de shouldPromptBiometric no que depende da senha', () => {
    // As duas leem o mesmo par (allowsBiometrics + password). Conta ligada e SEM
    // senha: a digital nao e oferecida E a tela precisa avisar. Travar as duas
    // juntas evita que uma mude sem a outra e a tela volte a mentir.
    const ligadaSemSenha = { ...contaA, password: undefined };
    const base = { isLoadingCredentials: false, deviceId: 'device-1', attemptedFor: null };

    expect(shouldPromptBiometric({ ...base, current: ligadaSemSenha })).toBe(false);
    expect(isBiometricPendingNextLogin(ligadaSemSenha)).toBe(true);

    expect(shouldPromptBiometric({ ...base, current: contaA })).toBe(true);
    expect(isBiometricPendingNextLogin(contaA)).toBe(false);
  });
});
