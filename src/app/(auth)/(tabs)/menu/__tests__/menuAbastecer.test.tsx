/**
 * Menu: "Abastecer" só com veículo associado e que não seja elétrico. Carregando ou com erro do contexto
 * (422 sem veículo, outra filial, elétrico; rede), o item não aparece.
 */
import React from 'react';

import { ThemeProvider } from '@shopify/restyle';
import TestRenderer, { act } from 'react-test-renderer';

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

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter, router: mockRouter, useFocusEffect: jest.fn() }));

// O que o menu desenha além da lista (foto, digital, modal de saída) não entra neste teste.
jest.mock('@/components/ProfilePhotoPicker', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/BiometricToggle', () => ({ BiometricToggle: () => null }));
jest.mock('@/components/Modal/Modal', () => ({ __esModule: true, default: () => null }));
jest.mock('../_components/BiometricPasswordPrompt', () => ({ BiometricPasswordPrompt: () => null }));
jest.mock('../_hooks/useBiometricActivation', () => ({ useBiometricActivation: () => ({}) }));

const mockCtx = jest.fn();
jest.mock('@/domain/agility/fuelEntry', () => ({ useFuelEntryContext: () => mockCtx() }));
jest.mock('@/services', () => ({
    useAuthCredentialsService: () => ({ userAuth: { fullname: 'Ana' }, removeCredentials: jest.fn(), userCredentialsCurrent: null }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const MenuScreen = require('../index').default;

function labels() {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
        tree = TestRenderer.create(
            <ThemeProvider theme={theme}>
                <MenuScreen />
            </ThemeProvider>,
        );
    });
    return tree.root.findAll((n) => typeof n.props.children === 'string').map((n) => n.props.children as string);
}

it('com veículo associado: "Abastecer" aparece', () => {
    mockCtx.mockReturnValue({ context: { plate: 'ABC1D23', rechargeOnly: false }, isLoading: false, isError: false });
    expect(labels()).toContain('Abastecer');
});

it.each([
    ['sem veículo (422)', { context: undefined, isLoading: false, isError: true }],
    ['carregando', { context: undefined, isLoading: true, isError: false }],
    ['veículo elétrico', { context: { plate: 'EV1', rechargeOnly: true }, isLoading: false, isError: false }],
])('%s: "Abastecer" não aparece', (_n, ret) => {
    mockCtx.mockReturnValue(ret);
    expect(labels()).not.toContain('Abastecer');
});
