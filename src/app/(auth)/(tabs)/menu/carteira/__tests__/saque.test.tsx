/**
 * Saque: a frase do back no erro, nenhum sucesso falso e um POST só, mesmo com
 * duplo toque no "Confirmar" ou fechando/reabrindo o modal com o pedido em voo.
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
// O teste só lê as props do campo; o Input real arrasta máscara e teclado.
jest.mock('@/components/Input/Input', () => ({ Input: () => null }));

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter, router: mockRouter }));

const mockShowToast = jest.fn();
jest.mock('@/services/Toast/useToast', () => ({ useToastService: () => ({ showToast: mockShowToast }) }));

// O modal real depende de ModalComponent; aqui ele só guarda as props para o teste tocar.
let mockModalProps: { isVisible: boolean; onPress?: () => Promise<void> | void; onClose: () => void } | null = null;
jest.mock('@/components/Modal/Modal', () => ({
    __esModule: true,
    default: (props: { isVisible: boolean; onPress?: () => Promise<void> | void; onClose: () => void }) => {
        mockModalProps = props;
        return null;
    },
}));

const mockRequestWithdrawal = jest.fn();
const mockRefetchWallet = jest.fn();
type MockWallet = { availableBalance: number; hasBankInfo: boolean; balance: number } | undefined;
const mockUseGetWallet = jest.fn<
    { wallet: MockWallet; isLoading: boolean; isError: boolean; refetch: typeof mockRefetchWallet },
    []
>(() => ({
    wallet: { availableBalance: 10000, hasBankInfo: true, balance: 10000 },
    isLoading: false,
    isError: false,
    refetch: mockRefetchWallet,
}));
jest.mock('@/domain/agility/wallet', () => ({
    useGetWallet: () => mockUseGetWallet(),
    useRequestWithdrawal: () => ({ requestWithdrawal: mockRequestWithdrawal, isPending: false }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const SaqueScreen = require('../saque').default;

function render() {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
        tree = TestRenderer.create(
            <ThemeProvider theme={theme}>
                <SaqueScreen />
            </ThemeProvider>,
        );
    });
    return tree;
}

const botao = (tree: TestRenderer.ReactTestRenderer) => tree.root.findAllByProps({ title: 'Solicitar Saque' })[0];

function digitarEPedir(tree: TestRenderer.ReactTestRenderer, cents: number) {
    act(() => {
        tree.root.findAll((n) => typeof n.props.onChangeCents === 'function')[0].props.onChangeCents(cents);
    });
    act(() => {
        botao(tree).props.onPress();
    });
}

beforeEach(() => {
    jest.clearAllMocks();
    mockModalProps = null;
    mockUseGetWallet.mockReturnValue({
        wallet: { availableBalance: 10000, hasBankInfo: true, balance: 10000 },
        isLoading: false,
        isError: false,
        refetch: mockRefetchWallet,
    });
});

describe('Saque', () => {
    // F5 (correção do review): GET /wallet falhou e não há nada em cache. Antes disso a
    // tela caía no `wallet?.hasBankInfo` falso e mostrava R$ 0,00 + "Configure seus dados
    // bancários" — parecia uma carteira vazia/sem PIX, quando na verdade nada carregou.
    it('erro ao carregar a carteira (sem nada em cache): mostra erro com "Tentar novamente", não R$ 0,00', () => {
        mockUseGetWallet.mockReturnValue({ wallet: undefined, isLoading: false, isError: true, refetch: mockRefetchWallet });
        const tree = render();

        expect(tree.root.findAllByProps({ testID: 'saque-carteira-erro' }).length).toBeGreaterThan(0);
        expect(tree.root.findAllByProps({ children: 'Configure seus dados bancários (toque para abrir)' })).toHaveLength(0);
        expect(tree.root.findAllByProps({ title: 'Solicitar Saque' })).toHaveLength(0);

        act(() => {
            tree.root.findAllByProps({ testID: 'saque-carteira-erro' })[0].props.onPress();
        });
        expect(mockRefetchWallet).toHaveBeenCalledTimes(1);

        act(() => tree.unmount());
    });

    it('back recusa: toast com a frase do back, sem sucesso, sem sair da tela e com o botão destravado', async () => {
        mockRequestWithdrawal.mockRejectedValue({ success: false, error: { message: 'Saldo disponível insuficiente' } });
        const tree = render();
        digitarEPedir(tree, 5000);
        expect(mockModalProps?.isVisible).toBe(true);

        await act(async () => {
            await mockModalProps!.onPress!();
        });

        expect(mockShowToast).toHaveBeenCalledWith({ message: 'Saldo disponível insuficiente', type: 'error' });
        expect(mockShowToast).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
        expect(mockRouter.replace).not.toHaveBeenCalled();
        expect(botao(tree).props.disabled).toBe(false);
    });

    it('sucesso: pede o valor em centavos e vai para Meus saques', async () => {
        mockRequestWithdrawal.mockResolvedValue({ id: 'wd-1' });
        const tree = render();
        digitarEPedir(tree, 5000);

        await act(async () => {
            await mockModalProps!.onPress!();
        });

        expect(mockRequestWithdrawal).toHaveBeenCalledWith({ amount: 5000 });
        expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
        expect(mockRouter.replace).toHaveBeenCalledWith('/menu/carteira/saques');
    });

    it('dois toques no "Confirmar" fazem um POST só', async () => {
        let responder!: (v: unknown) => void;
        mockRequestWithdrawal.mockReturnValue(new Promise((resolve) => (responder = resolve)));
        const tree = render();
        digitarEPedir(tree, 5000);
        const confirmar = mockModalProps!.onPress!;

        await act(async () => {
            void confirmar();
            void confirmar();
        });
        expect(mockRequestWithdrawal).toHaveBeenCalledTimes(1);

        await act(async () => {
            responder({ id: 'wd-1' });
        });
    });

    it('reabrir o pedido com o primeiro em voo não abre o modal nem manda outro POST', async () => {
        let responder!: (v: unknown) => void;
        mockRequestWithdrawal.mockReturnValue(new Promise((resolve) => (responder = resolve)));
        const tree = render();
        digitarEPedir(tree, 5000);

        await act(async () => {
            void mockModalProps!.onPress!();
        });
        expect(botao(tree).props.disabled).toBe(true);

        act(() => {
            botao(tree).props.onPress();
        });
        expect(mockModalProps?.isVisible).toBe(false);
        expect(mockRequestWithdrawal).toHaveBeenCalledTimes(1);

        await act(async () => {
            responder({ id: 'wd-1' });
        });
    });
});
