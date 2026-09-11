import { erroDeRede, mensagemDaApi } from '../apiErrorMessage';

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
