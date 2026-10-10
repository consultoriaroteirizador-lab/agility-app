import { erroDeRede, erroDeTimeout, erroTransitorio, mensagemDaApi } from '../apiErrorMessage';

it('timeout é erro de rede E é reconhecido à parte; sem rede não é timeout', () => {
    const timeout = { success: false, error: { code: 'AU-000', message: 'A requisição demorou demais.', timeout: true } };
    expect(erroDeRede(timeout)).toBe(true);
    expect(erroDeTimeout(timeout)).toBe(true);
    expect(erroDeTimeout({ success: false, error: { code: 'AU-000', message: 'Sem conexão' } })).toBe(false);
    expect(erroDeTimeout(undefined)).toBe(false);
});

it('lê a mensagem do formato que o interceptor rejeita ({ error: { message } })', () => {
    expect(mensagemDaApi({ success: false, error: { message: 'Rota sem valor de frete' } }, 'x'))
        .toBe('Rota sem valor de frete');
});
it('aceita Error comum', () => {
    expect(mensagemDaApi(new Error('boom'), 'x')).toBe('boom');
});
it('cai no fallback quando não há mensagem', () => {
    expect(mensagemDaApi(undefined, 'Erro ao aceitar rota')).toBe('Erro ao aceitar rota');
});
it('reconhece erro de rede pelo código AU-000', () => {
    expect(erroDeRede({ success: false, error: { code: 'AU-000', message: 'Sem conexão' } })).toBe(true);
    expect(erroDeRede({ success: false, error: { code: 'CONFLICT' } })).toBe(false);
});

// ─── Final fix wave M2 ────────────────────────────────────────────────────────

it('"Erro desconhecido" (fallback genérico do adapter) não é mensagem de verdade: cai no fallback do chamador', () => {
    expect(mensagemDaApi({ success: false, error: { message: 'Erro desconhecido' } }, 'Erro ao aceitar rota'))
        .toBe('Erro ao aceitar rota');
});

it('erroTransitorio reconhece erro de rede (AU-000)', () => {
    expect(erroTransitorio({ success: false, error: { code: 'AU-000' } })).toBe(true);
});

it('erroTransitorio reconhece 5xx do servidor', () => {
    expect(erroTransitorio({ success: false, error: { code: 'N/A' }, response: { status: 500 } })).toBe(true);
    expect(erroTransitorio({ success: false, error: { code: 'N/A' }, response: { status: 503 } })).toBe(true);
});

it('erroTransitorio é false para 4xx (regra de negócio, não instabilidade)', () => {
    expect(erroTransitorio({ success: false, error: { code: 'CONFLICT' }, response: { status: 409 } })).toBe(false);
    expect(erroTransitorio({ success: false, error: { code: 'N/A' }, response: { status: 400 } })).toBe(false);
});

it('erroTransitorio é false sem status e sem erro de rede', () => {
    expect(erroTransitorio(undefined)).toBe(false);
    expect(erroTransitorio(new Error('boom'))).toBe(false);
});
