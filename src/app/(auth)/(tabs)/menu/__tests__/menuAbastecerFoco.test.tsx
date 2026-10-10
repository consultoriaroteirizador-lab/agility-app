/**
 * Menu com o hook de verdade: a aba não desmonta, então uma falha do contexto escondia "Abastecer" até o app
 * ser fechado. Voltar ao Menu com o contexto em erro busca de novo.
 */
import React from 'react';

import { ThemeProvider } from '@shopify/restyle';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TestRenderer, { act } from 'react-test-renderer';

import { KEY_FUEL_ENTRIES } from '@/domain/queryKeys';
import { theme } from '@/theme';

jest.mock('react-native-webview', () => ({ WebView: () => null }));
jest.mock('@react-native-async-storage/async-storage', () =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-background-geolocation', () => ({
    __esModule: true,
    default: { ready: jest.fn(), onLocation: jest.fn(), removeListeners: jest.fn() },
}));
jest.mock('@/components/Icon/LocalIcon', () => ({ LocalIcon: () => null }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

// O `useFocusEffect` real pede um navegador; aqui ele guarda o efeito, e o teste o chama como o foco faria.
let mockFocusEffect: (() => void) | undefined;
const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn() };
jest.mock('expo-router', () => ({
    useRouter: () => mockRouter,
    router: mockRouter,
    useFocusEffect: (effect: () => void) => {
        mockFocusEffect = effect;
    },
}));

jest.mock('@/components/ProfilePhotoPicker', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/BiometricToggle', () => ({ BiometricToggle: () => null }));
jest.mock('@/components/Modal/Modal', () => ({ __esModule: true, default: () => null }));
jest.mock('../_components/BiometricPasswordPrompt', () => ({ BiometricPasswordPrompt: () => null }));
jest.mock('../_hooks/useBiometricActivation', () => ({ useBiometricActivation: () => ({}) }));
jest.mock('@/services', () => ({
    useAuthCredentialsService: () => ({
        userAuth: { fullname: 'Ana' },
        authCredentials: { accessToken: 'token', tenantId: 'tenant' },
        removeCredentials: jest.fn(),
        userCredentialsCurrent: null,
    }),
}));

const mockGetContext = jest.fn();
jest.mock('@/domain/agility/fuelEntry/fuelEntryAPI', () => ({
    fuelEntryAPI: { getContext: () => mockGetContext(), create: jest.fn(), listMine: jest.fn() },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const MenuScreen = require('../index').default;

const CONTEXTO = { vehicleId: 'v1', plate: 'ABC1D23', defaultFuelType: 'DIESEL', lastOdometerKm: 48000, rechargeOnly: false };
const SEM_VEICULO = { success: false, error: { message: 'Você não tem veículo associado. Fale com a central.', code: 'N/A' }, response: { status: 422 } };

let queryClient: QueryClient;
let tree: TestRenderer.ReactTestRenderer;

afterEach(() => {
    act(() => tree.unmount());
    queryClient.clear();
});

async function ate(cond: () => boolean) {
    for (let i = 0; i < 100 && !cond(); i++) {
        await act(async () => {
            await new Promise((r) => setTimeout(r, 10));
        });
    }
}

const temAbastecer = () => tree.root.findAll((n) => n.props.children === 'Abastecer').length > 0;

it('o contexto falhou ao abrir o Menu: voltar ao Menu busca de novo e "Abastecer" aparece', async () => {
    mockGetContext.mockRejectedValueOnce(SEM_VEICULO).mockResolvedValue(CONTEXTO);
    queryClient = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } });
    act(() => {
        tree = TestRenderer.create(
            <QueryClientProvider client={queryClient}>
                <ThemeProvider theme={theme}>
                    <MenuScreen />
                </ThemeProvider>
            </QueryClientProvider>,
        );
    });
    await ate(() => queryClient.getQueryState([KEY_FUEL_ENTRIES, 'context'])?.status === 'error' || mockGetContext.mock.calls.length > 1);
    expect(temAbastecer()).toBe(false);

    act(() => mockFocusEffect?.());
    await ate(temAbastecer);

    expect(temAbastecer()).toBe(true);
    expect(mockGetContext).toHaveBeenCalledTimes(2);
});
