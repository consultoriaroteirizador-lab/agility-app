const mockNavigate = jest.fn();
jest.mock('expo-router', () => ({
    router: { navigate: (...args: unknown[]) => mockNavigate(...args), replace: jest.fn(), push: jest.fn() },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { notificationRoutes } = require('../notificationRoutes');

it('"carteira" abre a carteira (push da troca da chave PIX, F3)', () => {
    notificationRoutes.carteira();
    expect(mockNavigate).toHaveBeenCalledWith('/(auth)/(tabs)/menu/carteira');
});
