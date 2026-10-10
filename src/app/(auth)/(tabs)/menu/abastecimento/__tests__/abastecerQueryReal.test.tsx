/**
 * Abastecer com os hooks de verdade (QueryClient real, só a API mockada). O teste com o hook mockado não vê
 * o que o react-query faz: o envio invalida a chave, o contexto é buscado de novo e, sem rede, a busca falha
 * com o contexto antigo ainda em `data` e `isError` true.
 */
import React from 'react';

import { ThemeProvider } from '@shopify/restyle';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TestRenderer, { act } from 'react-test-renderer';

import { OFFLINE_MESSAGE } from '@/domain/agility/fuelEntry/fuelEntryDisplay';
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
jest.mock('@/components/Input/Input', () => ({ Input: () => null }));
jest.mock('@/components/MultiPhotoPicker', () => ({ MultiPhotoPicker: () => null }));

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter, router: mockRouter }));
jest.mock('@/services/Toast/useToast', () => ({ useToastService: () => ({ showToast: jest.fn() }) }));
jest.mock('@/services', () => ({
    useAuthCredentialsService: () => ({ authCredentials: { accessToken: 'token', tenantId: 'tenant' } }),
}));

const mockGetContext = jest.fn();
const mockCreate = jest.fn();
jest.mock('@/domain/agility/fuelEntry/fuelEntryAPI', () => ({
    fuelEntryAPI: { getContext: () => mockGetContext(), create: (...a: unknown[]) => mockCreate(...a), listMine: jest.fn() },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const AbastecerScreen = require('../index').default;

const CONTEXTO = { vehicleId: 'v1', plate: 'ABC1D23', defaultFuelType: 'DIESEL', lastOdometerKm: 48000, rechargeOnly: false };
const SEM_REDE = { success: false, error: { message: 'Sem conexão com o servidor. Verifique sua internet e tente novamente.', code: 'AU-000' } };
const CHAVE_CONTEXTO = [KEY_FUEL_ENTRIES, 'context'];

let queryClient: QueryClient;
let tree: TestRenderer.ReactTestRenderer;

beforeEach(() => {
    mockGetContext.mockReset();
    mockCreate.mockReset();
    // retryDelay 0: o hook decide SE tenta de novo; o teste não espera o intervalo.
    queryClient = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 }, mutations: { retry: false } } });
});

afterEach(() => {
    act(() => tree.unmount());
    queryClient.clear();
});

function render() {
    act(() => {
        tree = TestRenderer.create(
            <QueryClientProvider client={queryClient}>
                <ThemeProvider theme={theme}>
                    <AbastecerScreen />
                </ThemeProvider>
            </QueryClientProvider>,
        );
    });
}

async function ate(cond: () => boolean) {
    for (let i = 0; i < 100 && !cond(); i++) {
        await act(async () => {
            await new Promise((r) => setTimeout(r, 10));
        });
    }
}

const campo = (title: string) => tree.root.findAll((n) => n.props.title === title && typeof n.props.onChangeText === 'function')[0];
const painel = () => tree.root.findAllByProps({ testID: 'abastecer-contexto-erro' });
const temTexto = (s: string) => tree.root.findAll((n) => n.props.children === s).length > 0;
const contextoAssentouEmErro = () => {
    const s = queryClient.getQueryState(CHAVE_CONTEXTO);
    return s?.status === 'error' && s.fetchStatus === 'idle';
};

it('sem internet no envio: a nova busca do contexto falha e o formulário preenchido continua na tela', async () => {
    mockGetContext.mockResolvedValueOnce(CONTEXTO).mockRejectedValue(SEM_REDE);
    mockCreate.mockRejectedValue(SEM_REDE);
    render();
    await ate(() => campo('Litros') !== undefined);

    act(() => {
        campo('Litros').props.onChangeText('45,5');
        tree.root.findAll((n) => typeof n.props.onChangeCents === 'function')[0].props.onChangeCents(25000);
        campo('Odômetro do painel (km)').props.onChangeText('48210');
        tree.root.findAll((n) => typeof n.props.onPhotosChange === 'function')[0].props.onPhotosChange([{ uri: 'file://n.jpg', width: 10, height: 10 }]);
    });
    await act(async () => {
        await tree.root.findAllByProps({ title: 'Enviar' })[0].props.onPress();
    });
    await ate(contextoAssentouEmErro);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockGetContext.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(contextoAssentouEmErro()).toBe(true);
    expect(painel()).toHaveLength(0);
    expect(campo('Litros').props.value).toBe('45,5');
});

it('sem internet ao abrir: o painel diz que falta conexão, sem prometer o que foi digitado', async () => {
    mockGetContext.mockRejectedValue(SEM_REDE);
    render();
    await ate(() => painel().length > 0);

    expect(temTexto(SEM_REDE.error.message)).toBe(true);
    expect(temTexto(OFFLINE_MESSAGE)).toBe(false);
});
