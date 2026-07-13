import { authAdapter } from '../authAdapter';
import { AuthCredentials } from '../authType';

const b64url = (obj: object) =>
  Buffer.from(JSON.stringify(obj))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const makeJwt = (claims: object) =>
  `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ sub: 'user-1', ...claims })}.sig`;

const current: AuthCredentials = {
  accessToken: 'OLD.ACCESS.TOKEN',
  refreshToken: 'old-refresh',
  expiration: '2026-01-01T00:00:00.000Z',
  expirationRefreshToken: '2026-12-31T00:00:00.000Z',
  scope: 'openid profile',
  tenantId: 'tenant-xyz',
  userStatus: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('authAdapter.mergeRefreshedTokens', () => {
  it('atualiza tokens e preserva tenantId/userStatus/scope/expirationRefreshToken', () => {
    const exp = 1893456000; // 2030-01-01T00:00:00Z
    const accessToken = makeJwt({ exp });
    const now = new Date('2026-06-17T12:00:00.000Z');

    const merged = authAdapter.mergeRefreshedTokens(
      current,
      { accessToken, refreshToken: 'new-refresh' },
      now,
    );

    expect(merged.accessToken).toBe(accessToken);
    expect(merged.refreshToken).toBe('new-refresh');
    expect(merged.expiration).toBe(new Date(exp * 1000).toISOString());
    expect(merged.createdAt).toBe(now.toISOString());
    // preservados
    expect(merged.tenantId).toBe('tenant-xyz');
    expect(merged.userStatus).toBe('ACTIVE');
    expect(merged.scope).toBe('openid profile');
    expect(merged.expirationRefreshToken).toBe(current.expirationRefreshToken);
  });

  it('mantém o refreshToken atual quando o SDK não devolve um novo', () => {
    const accessToken = makeJwt({ exp: 1893456000 });
    const merged = authAdapter.mergeRefreshedTokens(current, { accessToken });
    expect(merged.refreshToken).toBe('old-refresh');
  });

  it('usa a expiração atual quando o novo token não tem claim exp', () => {
    const accessToken = makeJwt({}); // sem exp
    const merged = authAdapter.mergeRefreshedTokens(current, { accessToken });
    expect(merged.expiration).toBe(current.expiration);
  });

  it('lança quando o accessToken novo é inválido (chamador deve ignorar o sync)', () => {
    expect(() => authAdapter.mergeRefreshedTokens(current, { accessToken: 'lixo' })).toThrow();
  });
});
