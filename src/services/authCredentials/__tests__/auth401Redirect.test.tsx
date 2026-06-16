/**
 * Teste de integração do tratamento de 401.
 *
 * Monta o AuthCredentialsProvider REAL e dispara um 401 REAL pela instância
 * `apiAgility` (que já tem os interceptors de produção de apiConfig.ts +
 * o create401Handler registrado pelo provider). Valida os 4 caminhos:
 *   1. 401 sem refresh token        -> redireciona para login
 *   2. 401 + refresh token falha     -> redireciona para login
 *   3. 401 + refresh token sucesso   -> retenta request, NÃO redireciona
 *   4. 401 em rota pública (x-api-key) -> NÃO redireciona, NÃO tenta refresh
 */
import React from 'react';

import { AxiosError } from 'axios';
import TestRenderer, { act } from 'react-test-renderer';

import { apiAgility } from '@/api';
import { authService } from '@/domain/Auth/authService';
import { goLoginScreen } from '@/routes';
import { AuthCredentialsProvider } from '@/services/authCredentials/Providers/AuthCredentialsProvider';

// --- Mocks de leaf (navegação + storages nativos) ---------------------------
jest.mock('@/routes', () => ({
  goLoginScreen: jest.fn(),
  goHomeScreen: jest.fn(),
  goChanceTemporaryPasswordScreen: jest.fn(),
  goRegisterAllowsBiometricScreen: jest.fn(),
  goUpdateVersionScreen: jest.fn(),
  goForgotPasswordScreen: jest.fn(),
  goMenuScreen: jest.fn(),
}));

const mockAuthStorageGet = jest.fn();
jest.mock('@/services/authCredentials/authCredentialsStorage', () => ({
  authCredentialsStorage: {
    get: (...a: unknown[]) => mockAuthStorageGet(...a),
    set: jest.fn(),
    remove: jest.fn(),
  },
}));

jest.mock('@/services/authCredentials/userCredentialsStorage', () => ({
  userCredentialsStorage: {
    getAll: jest.fn().mockResolvedValue([]),
    getCurrent: jest.fn().mockResolvedValue(null),
    setCurrent: jest.fn(),
    setInAll: jest.fn(),
    remove: jest.fn(),
    removeCurrent: jest.fn(),
  },
}));

// --- Helpers ----------------------------------------------------------------
const b64url = (obj: object) =>
  Buffer.from(JSON.stringify(obj))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

/** JWT válido o suficiente para decodeJWT (precisa de `sub`). */
const makeJwt = (sub = 'user-1') => {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ sub, exp, name: 'Tester' })}.sig`;
};

const futureIso = (msFromNow: number) => new Date(Date.now() + msFromNow).toISOString();

const makeCreds = (over: Record<string, unknown> = {}) => ({
  accessToken: makeJwt(),
  refreshToken: 'refresh-abc',
  expiration: futureIso(60 * 60 * 1000), // 1h
  expirationRefreshToken: futureIso(24 * 60 * 60 * 1000), // 24h
  createdAt: new Date().toISOString(),
  scope: '',
  tenantId: 'tenant-1',
  userStatus: 'ACTIVE',
  ...over,
});

const flush = () => act(async () => { await new Promise((r) => setImmediate(r)); });

async function mountProvider() {
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<AuthCredentialsProvider>{null}</AuthCredentialsProvider>);
  });
  await flush(); // deixa o bootstrap (handleUserCredentials + startAuthCredentials) terminar
  return renderer;
}

/**
 * Adapter que devolve 401 nas N primeiras chamadas e 200 depois.
 * Um adapter customizado NÃO aplica `validateStatus` automaticamente, então
 * replicamos o `settle` do axios: 2xx resolve, demais rejeitam com AxiosError
 * (com `response.status`), exatamente como um servidor real devolvendo 401.
 */
function set401Adapter(failTimes = Infinity, onCall?: (cfg: any) => void) {
  let calls = 0;
  (apiAgility.defaults as any).adapter = async (config: any) => {
    calls += 1;
    onCall?.(config);
    const status = calls <= failTimes ? 401 : 200;
    const response = {
      data: { success: status === 200, error: { message: 'unauthorized', code: 'AU-401' } },
      status,
      statusText: status === 200 ? 'OK' : 'Unauthorized',
      headers: {},
      config,
      request: {},
    };
    if (status >= 200 && status < 300) return response;
    throw new AxiosError('Request failed with status 401', 'ERR_BAD_REQUEST', config, {}, response as any);
  };
}

async function fireRequest(config?: any) {
  let error: any;
  let result: any;
  await act(async () => {
    try {
      result = await apiAgility.get('/routings', config);
    } catch (e) {
      error = e;
    }
  });
  return { error, result };
}

describe('Tratamento de 401 -> redireciona para login', () => {
  let renderer: TestRenderer.ReactTestRenderer | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthStorageGet.mockReset();
  });

  afterEach(async () => {
    if (renderer) {
      await act(async () => { renderer!.unmount(); }); // ejeta o interceptor do provider
      renderer = null;
    }
    delete (apiAgility.defaults as any).adapter;
  });

  it('1) 401 sem refresh token -> chama goLoginScreen', async () => {
    mockAuthStorageGet.mockResolvedValue(makeCreds({ refreshToken: '' }));
    renderer = await mountProvider();

    set401Adapter();
    const { error } = await fireRequest();
    await flush();

    expect(goLoginScreen).toHaveBeenCalledTimes(1);
    expect(error).toBeTruthy();
  });

  it('2) 401 + refresh token FALHA -> chama goLoginScreen', async () => {
    mockAuthStorageGet.mockResolvedValue(makeCreds());
    const refreshSpy = jest
      .spyOn(authService, 'refreshToken')
      .mockRejectedValue(new Error('refresh expirou'));
    renderer = await mountProvider();

    set401Adapter();
    await fireRequest();
    await flush();

    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(goLoginScreen).toHaveBeenCalledTimes(1);
    refreshSpy.mockRestore();
  });

  it('3) 401 + refresh token SUCESSO -> retenta request e NÃO redireciona', async () => {
    mockAuthStorageGet.mockResolvedValue(makeCreds());
    const refreshSpy = jest.spyOn(authService, 'refreshToken').mockResolvedValue(
      makeCreds({ accessToken: makeJwt('user-1-new'), refreshToken: 'refresh-new' }) as any,
    );
    renderer = await mountProvider();

    // 401 só na 1ª chamada; a retentativa (2ª) recebe 200
    set401Adapter(1);
    const { error, result } = await fireRequest();
    await flush();

    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(goLoginScreen).not.toHaveBeenCalled();
    expect(error).toBeFalsy();
    expect(result?.status).toBe(200);
    refreshSpy.mockRestore();
  });

  it('4) 401 em rota pública (x-api-key, sem Authorization) -> NÃO redireciona', async () => {
    mockAuthStorageGet.mockResolvedValue(makeCreds());
    const refreshSpy = jest.spyOn(authService, 'refreshToken');
    renderer = await mountProvider();

    set401Adapter();
    await fireRequest({ headers: { 'x-api-key': 'public-key' }, skipAuth: true } as any);
    await flush();

    expect(refreshSpy).not.toHaveBeenCalled();
    expect(goLoginScreen).not.toHaveBeenCalled();
    refreshSpy.mockRestore();
  });
});
