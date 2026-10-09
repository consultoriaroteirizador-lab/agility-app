/**
 * As pilhas das abas precisam declarar a home como âncora. Quem chega por link (notificação)
 * entra com `withAnchor` e ganha a home por baixo; sem âncora, a aba fica presa na tela do link
 * (Menu preso na Carteira, rodada de 09/10/2026).
 */
jest.mock('expo-router', () => ({ Stack: Object.assign(() => null, { Screen: () => null }) }));

it.each([
    ['menu', '../_layout'],
    ['menu/suporte', '../suporte/_layout'],
    ['ofertas', '../../ofertas/_layout'],
])('a pilha %s ancora na sua home', (_nome, caminho) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    expect(require(caminho).unstable_settings).toEqual({ anchor: 'index' });
});
