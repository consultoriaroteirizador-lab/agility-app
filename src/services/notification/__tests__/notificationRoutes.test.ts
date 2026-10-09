const mockNavigate = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
    router: {
        navigate: (...args: unknown[]) => mockNavigate(...args),
        replace: jest.fn(),
        push: (...args: unknown[]) => mockPush(...args),
    },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { notificationRoutes, abrirDestinoDaNotificacao } = require('../notificationRoutes');

beforeEach(() => {
    mockNavigate.mockClear();
    mockPush.mockClear();
});

// Sem `withAnchor`, a pilha da aba nasce só com a tela do link: o voltar sai da aba e a aba
// fica presa nela até recarregar o app (Menu preso na Carteira, rodada de 09/10/2026).
it('"carteira" abre a carteira com a home do Menu por baixo (push da troca da chave PIX, F3)', () => {
    notificationRoutes.carteira();
    expect(mockNavigate).toHaveBeenCalledWith('/(auth)/(tabs)/menu/carteira', { withAnchor: true });
});

it('"suporte" com chatId abre a conversa com as telas de origem por baixo', () => {
    notificationRoutes.suporte({ id: 'chat-1' });
    expect(mockNavigate).toHaveBeenCalledWith(
        { pathname: '/(auth)/(tabs)/menu/suporte/[id]', params: { id: 'chat-1' } },
        { withAnchor: true },
    );
});

it('"ofertas" com id abre a oferta com a lista por baixo', () => {
    notificationRoutes.ofertas({ id: 'rota-1' });
    expect(mockNavigate).toHaveBeenCalledWith(
        { pathname: '/(auth)/(tabs)/ofertas/[id]', params: { id: 'rota-1' } },
        { withAnchor: true },
    );
});

it('destino por caminho entra com a âncora da pilha', () => {
    abrirDestinoDaNotificacao({ tipo: 'caminho', caminho: '/menu/carteira' });
    expect(mockPush).toHaveBeenCalledWith('/menu/carteira', { withAnchor: true });
});
