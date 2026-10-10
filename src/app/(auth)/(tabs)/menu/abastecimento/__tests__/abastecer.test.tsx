/**
 * Abastecer: foto obrigatória, número com vírgula vira número com ponto, um POST só com duplo toque, e sem
 * internet o que foi digitado fica na tela.
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
// O teste só lê e chama as props: o Input real arrasta máscara e teclado, o picker real arrasta a câmera.
jest.mock('@/components/Input/Input', () => ({ Input: () => null }));
jest.mock('@/components/MultiPhotoPicker', () => ({ MultiPhotoPicker: () => null }));

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter, router: mockRouter }));

const mockShowToast = jest.fn();
jest.mock('@/services/Toast/useToast', () => ({ useToastService: () => ({ showToast: mockShowToast }) }));

const mockCreate = jest.fn();
const mockRefetch = jest.fn();
type Ctx = { context: unknown; isLoading: boolean; isError: boolean; error: unknown; refetch: jest.Mock };
const mockUseContext = jest.fn<Ctx, []>();
jest.mock('@/domain/agility/fuelEntry', () => ({
    ...jest.requireActual('@/domain/agility/fuelEntry/fuelEntryForm'),
    ...jest.requireActual('@/domain/agility/fuelEntry/fuelEntryDisplay'),
    useFuelEntryContext: () => mockUseContext(),
    useCreateFuelEntry: () => ({ createFuelEntry: mockCreate, isPending: false }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const AbastecerScreen = require('../index').default;

const CONTEXTO = { vehicleId: 'v1', plate: 'ABC1D23', defaultFuelType: 'DIESEL', lastOdometerKm: 48000, rechargeOnly: false };
const FOTO = { uri: 'file://nota.jpg', width: 3000, height: 4000 };

beforeEach(() => {
    jest.clearAllMocks();
    mockUseContext.mockReturnValue({ context: CONTEXTO, isLoading: false, isError: false, error: null, refetch: mockRefetch });
});

function render() {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
        tree = TestRenderer.create(
            <ThemeProvider theme={theme}>
                <AbastecerScreen />
            </ThemeProvider>,
        );
    });
    return tree;
}

const campo = (t: TestRenderer.ReactTestRenderer, title: string) =>
    t.root.findAll((n) => n.props.title === title && typeof n.props.onChangeText === 'function')[0];
const botao = (t: TestRenderer.ReactTestRenderer) => t.root.findAllByProps({ title: 'Enviar' })[0];
const temTexto = (t: TestRenderer.ReactTestRenderer, s: string) => t.root.findAll((n) => n.props.children === s).length > 0;

function preencher(t: TestRenderer.ReactTestRenderer, { foto = true } = {}) {
    act(() => {
        campo(t, 'Litros').props.onChangeText('45,5');
        t.root.findAll((n) => typeof n.props.onChangeCents === 'function')[0].props.onChangeCents(25000);
        campo(t, 'Odômetro do painel (km)').props.onChangeText('48.210');
        if (foto) t.root.findAll((n) => typeof n.props.onPhotosChange === 'function')[0].props.onPhotosChange([FOTO]);
    });
}

it('mostra a placa fixa e o último odômetro como referência', () => {
    const t = render();
    expect(temTexto(t, 'ABC1D23')).toBe(true);
    expect(temTexto(t, 'Último registrado: 48.000 km')).toBe(true);
});

it('a foto só sai da câmera, uma só', () => {
    const picker = render().root.findAll((n) => typeof n.props.onPhotosChange === 'function')[0];
    expect(picker.props.allowGallery).toBe(false);
    expect(picker.props.maxPhotos).toBe(1);
});

it('sem foto, Enviar fica desligado e diz por quê', () => {
    const t = render();
    preencher(t, { foto: false });
    expect(botao(t).props.disabled).toBe(true);
    expect(temTexto(t, 'Tire a foto da nota para enviar')).toBe(true);
});

it('envia litros e odômetro convertidos, e vai para Meus abastecimentos', async () => {
    mockCreate.mockResolvedValue({ odometerInconsistent: false, previousOdometerKm: 48000 });
    const t = render();
    preencher(t);
    await act(async () => {
        await botao(t).props.onPress();
    });
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith({
        payload: { fuelType: 'DIESEL', liters: 45.5, totalValue: 250, odometerKm: 48210, fullTank: true, paidBy: 'COMPANY' },
        photo: FOTO,
    });
    expect(mockShowToast).toHaveBeenCalledWith({ message: 'Abastecimento registrado.', type: 'success' });
    expect(mockRouter.replace).toHaveBeenCalledWith('/menu/abastecimento/historico');
});

it('duplo toque em Enviar: um POST só', async () => {
    let resolver!: (v: unknown) => void;
    mockCreate.mockReturnValue(
        new Promise((r) => {
            resolver = r;
        }),
    );
    const t = render();
    preencher(t);
    await act(async () => {
        void botao(t).props.onPress();
        void botao(t).props.onPress();
        resolver({ odometerInconsistent: false, previousOdometerKm: null });
    });
    expect(mockCreate).toHaveBeenCalledTimes(1);
});

it('sem internet: diz que precisa de internet e mantém o que foi digitado', async () => {
    mockCreate.mockRejectedValue({ success: false, error: { message: 'Sem conexão com o servidor.', code: 'AU-000' } });
    const t = render();
    preencher(t);
    await act(async () => {
        await botao(t).props.onPress();
    });
    expect(mockShowToast).toHaveBeenCalledWith({
        message: 'Sem internet. O que você digitou continua aqui: conecte-se e toque em Enviar de novo.',
        type: 'error',
    });
    expect(campo(t, 'Litros').props.value).toBe('45,5');
    expect(mockRouter.replace).not.toHaveBeenCalled();
});

it('recusa do back: a frase de cada campo no toast', async () => {
    mockCreate.mockRejectedValue({
        success: false,
        error: {
            message: 'Um ou mais campos estão com erros de validação',
            code: 'BAD_REQUEST',
            validationErrors: [{ field: 'x', message: 'Litros acima do tanque.' }],
        },
    });
    const t = render();
    preencher(t);
    await act(async () => {
        await botao(t).props.onPress();
    });
    expect(mockShowToast).toHaveBeenCalledWith({ message: 'Litros acima do tanque.', type: 'error' });
});

it('odômetro abaixo do anterior: o toast avisa a revisão', async () => {
    mockCreate.mockResolvedValue({ odometerInconsistent: true, previousOdometerKm: 50000 });
    const t = render();
    preencher(t);
    await act(async () => {
        await botao(t).props.onPress();
    });
    expect(mockShowToast).toHaveBeenCalledWith({
        message: 'Abastecimento registrado, mas o odômetro está abaixo do último (50.000 km). A central vai revisar.',
        type: 'success',
    });
});

it('veículo flex (sem combustível sugerido): obriga a escolher', () => {
    mockUseContext.mockReturnValue({
        context: { ...CONTEXTO, defaultFuelType: null },
        isLoading: false,
        isError: false,
        error: null,
        refetch: mockRefetch,
    });
    const t = render();
    preencher(t);
    expect(botao(t).props.disabled).toBe(true);
    expect(temTexto(t, 'Escolha o combustível')).toBe(true);
});

it('sem veículo (422): a frase do back e Tentar novamente', () => {
    mockUseContext.mockReturnValue({
        context: undefined,
        isLoading: false,
        isError: true,
        refetch: mockRefetch,
        error: {
            success: false,
            error: { message: 'Você não tem veículo associado. Fale com a central.', code: 'UNPROCESSABLE_ENTITY', validationErrors: [] },
        },
    });
    const t = render();
    expect(temTexto(t, 'Você não tem veículo associado. Fale com a central.')).toBe(true);
    act(() => {
        t.root.findAllByProps({ testID: 'abastecer-contexto-erro' })[0].props.onPress();
    });
    expect(mockRefetch).toHaveBeenCalled();
});
