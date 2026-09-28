/**
 * Dados bancários: apagar um campo apaga no back (null), a chave é normalizada, o erro
 * mostra a frase do back sem sucesso falso e o salvar é um envio só.
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
// O teste só lê as props dos campos; o Input real arrasta máscara e teclado.
jest.mock('@/components/Input/Input', () => ({ Input: () => null }));

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter, router: mockRouter }));

const mockShowToast = jest.fn();
jest.mock('@/services/Toast/useToast', () => ({ useToastService: () => ({ showToast: mockShowToast }) }));

const mockUpdateBankInfo = jest.fn();
jest.mock('@/domain/agility/wallet', () => ({
    useGetWallet: () => ({
        wallet: {
            id: 'w-1',
            pixKey: '12345678900',
            pixKeyType: 'CPF',
            bankName: 'Banco X',
            bankAgency: '1234',
            bankAccount: '56789-0',
            hasBankInfo: true,
        },
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
    }),
    useUpdateBankInfo: () => ({ updateBankInfo: mockUpdateBankInfo, isPending: false }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const DadosBancariosScreen = require('../config/dados-bancarios').default;

function render() {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
        tree = TestRenderer.create(
            <ThemeProvider theme={theme}>
                <DadosBancariosScreen />
            </ThemeProvider>,
        );
    });
    return tree;
}

function digitar(tree: TestRenderer.ReactTestRenderer, placeholder: string, valor: string) {
    act(() => {
        tree.root.findAllByProps({ placeholder })[0].props.onChangeText(valor);
    });
}

const salvar = (tree: TestRenderer.ReactTestRenderer) => tree.root.findAllByProps({ title: 'Salvar dados' })[0];

beforeEach(() => jest.clearAllMocks());

describe('Dados bancários', () => {
    it('apagar banco, agência e conta manda null nos três', async () => {
        mockUpdateBankInfo.mockResolvedValue({});
        const tree = render();
        digitar(tree, 'Nome do banco', '');
        digitar(tree, '0000', '');
        digitar(tree, '00000-0', '');

        await act(async () => {
            await salvar(tree).props.onPress();
        });

        expect(mockUpdateBankInfo).toHaveBeenCalledWith({
            pixKeyType: 'CPF',
            pixKey: '12345678900',
            bankName: null,
            bankAgency: null,
            bankAccount: null,
        });
        expect(mockRouter.back).toHaveBeenCalled();
    });

    it('remover a chave PIX (com a conta completa) manda null na chave e no tipo', async () => {
        mockUpdateBankInfo.mockResolvedValue({});
        const tree = render();
        act(() => {
            tree.root.findAllByProps({ testID: 'remover-pix' })[0].props.onPress();
        });

        await act(async () => {
            await salvar(tree).props.onPress();
        });

        expect(mockUpdateBankInfo).toHaveBeenCalledWith({
            pixKeyType: null,
            pixKey: null,
            bankName: 'Banco X',
            bankAgency: '1234',
            bankAccount: '56789-0',
        });
    });

    it('CPF digitado com máscara é salvo só com dígitos', async () => {
        mockUpdateBankInfo.mockResolvedValue({});
        const tree = render();
        digitar(tree, '000.000.000-00', '987.654.321-00');

        await act(async () => {
            await salvar(tree).props.onPress();
        });

        expect(mockUpdateBankInfo).toHaveBeenCalledWith(expect.objectContaining({ pixKey: '98765432100', pixKeyType: 'CPF' }));
    });

    it('erro do back: toast com a frase do back, sem sucesso e sem sair da tela', async () => {
        mockUpdateBankInfo.mockRejectedValue({ success: false, error: { message: 'Carteira não encontrada' } });
        const tree = render();

        await act(async () => {
            await salvar(tree).props.onPress();
        });

        expect(mockShowToast).toHaveBeenCalledWith({ message: 'Carteira não encontrada', type: 'error' });
        expect(mockShowToast).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
        expect(mockRouter.back).not.toHaveBeenCalled();
    });

    it('dois toques em salvar fazem um envio só', async () => {
        let responder!: (v: unknown) => void;
        mockUpdateBankInfo.mockReturnValue(new Promise((resolve) => (responder = resolve)));
        const tree = render();
        const onPress = salvar(tree).props.onPress;

        await act(async () => {
            void onPress();
            void onPress();
        });
        expect(mockUpdateBankInfo).toHaveBeenCalledTimes(1);

        await act(async () => {
            responder({});
        });
    });
});
