/**
 * Saque: a frase do back no erro, nenhum sucesso falso e um POST só, mesmo com
 * duplo toque no "Confirmar" ou fechando/reabrindo o modal com o pedido em voo.
 */
import React from 'react';

import { ThemeProvider } from '@shopify/restyle';
import TestRenderer, { act } from 'react-test-renderer';

import { theme } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';

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
type ModalProps = { isVisible: boolean; text?: string; onPress?: () => Promise<void> | void; onClose: () => void };
let mockModalProps: ModalProps | null = null;
jest.mock('@/components/Modal/Modal', () => ({
    __esModule: true,
    default: (props: ModalProps) => {
        mockModalProps = props;
        return null;
    },
}));

const mockRequestWithdrawal = jest.fn();
const mockRefetchWallet = jest.fn();
type MockWallet =
    | {
          availableBalance: number;
          hasBankInfo: boolean;
          balance: number;
          pixKey?: string | null;
          pixKeyChangedAt?: string | null;
          previousPixKeyMasked?: string | null;
          bankName?: string | null;
          bankAgency?: string | null;
          bankAccount?: string | null;
      }
    | undefined;
const mockUseGetWallet = jest.fn<
    { wallet: MockWallet; isLoading: boolean; isError: boolean; refetch: typeof mockRefetchWallet },
    []
>(() => ({
    wallet: { availableBalance: 10000, hasBankInfo: true, balance: 10000 },
    isLoading: false,
    isError: false,
    refetch: mockRefetchWallet,
}));
const mockUseWithdrawalAllowance = jest.fn<{ allowance: unknown }, []>(() => ({ allowance: null }));
const mockUseGetAdvancesSummary = jest.fn<{ summary: unknown }, []>(() => ({ summary: undefined }));
jest.mock('@/domain/agility/wallet', () => ({
    useGetWallet: () => mockUseGetWallet(),
    useRequestWithdrawal: () => ({ requestWithdrawal: mockRequestWithdrawal, isPending: false }),
    useWithdrawalAllowance: () => mockUseWithdrawalAllowance(),
    useGetAdvancesSummary: () => mockUseGetAdvancesSummary(),
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

const campo = (tree: TestRenderer.ReactTestRenderer) => tree.root.findAll((n) => typeof n.props.onChangeCents === 'function')[0];
const texto = (tree: TestRenderer.ReactTestRenderer, testID: string) => tree.root.findAllByProps({ testID })[0]?.props.children;

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
    mockUseWithdrawalAllowance.mockReturnValue({ allowance: null });
    mockUseGetAdvancesSummary.mockReturnValue({ summary: undefined });
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

describe('Saque — política de dívida (F3)', () => {
    it('EXCESS_ONLY: o teto do campo e o "Sacar tudo" são o máximo da política, com o aviso', () => {
        mockUseWithdrawalAllowance.mockReturnValue({ allowance: { policy: 'EXCESS_ONLY', withdrawableCents: 7000, openDebtCents: 3000 } });
        const tree = render();

        expect(campo(tree).props.maxCents).toBe(7000);
        expect(tree.root.findAllByProps({ testID: 'sacar-tudo' })[0].props.disabled).toBe(false);
        expect(texto(tree, 'aviso-politica-divida-texto')).toBe(
            `Com ${formatCurrency(3000)} em dívidas abertas, você pode sacar até ${formatCurrency(7000)}.`,
        );
    });

    it('valor acima do teto da política: não abre o modal e diz o máximo', () => {
        mockUseWithdrawalAllowance.mockReturnValue({ allowance: { policy: 'EXCESS_ONLY', withdrawableCents: 7000, openDebtCents: 3000 } });
        const tree = render();
        digitarEPedir(tree, 8000);

        expect(mockModalProps?.isVisible).toBe(false);
        expect(mockShowToast).toHaveBeenCalledWith({
            message: `Pela regra de dívidas da empresa, o máximo agora é ${formatCurrency(7000)}`,
            type: 'error',
        });
    });

    it('back recusa pela política com o máximo: mensagem com o valor, ação que só preenche o campo', async () => {
        mockRequestWithdrawal.mockRejectedValue({
            success: false,
            error: { code: 'WITHDRAWAL_EXCEEDS_AMOUNT_ABOVE_DEBT', message: 'Com R$ 60,00 em dívidas abertas, o saque máximo é R$ 40,00.', maxAmountCents: 4000 },
        });
        const tree = render();
        digitarEPedir(tree, 5000);

        await act(async () => {
            await mockModalProps!.onPress!();
        });

        const toast = mockShowToast.mock.calls[mockShowToast.mock.calls.length - 1][0];
        expect(toast.message).toBe(`Você tem dívidas em aberto com a empresa. O máximo que pode sacar agora é ${formatCurrency(4000)}.`);
        expect(toast.type).toBe('error');
        expect(toast.action.title).toBe('Usar o máximo');

        act(() => {
            toast.action.onPress();
        });
        expect(campo(tree).props.valueCents).toBe(4000);
        expect(mockRequestWithdrawal).toHaveBeenCalledTimes(1);
        expect(mockRouter.replace).not.toHaveBeenCalled();
        expect(mockShowToast).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
        expect(botao(tree).props.disabled).toBe(false);
    });

    it('BLOCK_IF_OVERDUE com dívida vencida: aviso de bloqueio, "Sacar tudo" e o botão travados', () => {
        mockUseWithdrawalAllowance.mockReturnValue({ allowance: { policy: 'BLOCK_IF_OVERDUE', withdrawableCents: 0, openDebtCents: 5000 } });
        mockUseGetAdvancesSummary.mockReturnValue({ summary: { totalPending: 5000, count: 1, overdueCount: 1 } });
        const tree = render();

        expect(texto(tree, 'aviso-politica-divida-texto')).toBe(
            'Saque bloqueado: você tem 1 dívida(s) vencida(s) com a empresa. Devolva o valor para liberar o saque.',
        );
        expect(tree.root.findAllByProps({ testID: 'sacar-tudo' })[0].props.disabled).toBe(true);
        act(() => {
            campo(tree).props.onChangeCents(5000);
        });
        expect(botao(tree).props.disabled).toBe(true);
    });

    // P10: ao lado do bloqueio não aparece "Valor mínimo..." (nem outro motivo de botão travado).
    it('BLOCK_IF_OVERDUE sem valor digitado: não mostra "Valor mínimo" ao lado do bloqueio', () => {
        mockUseWithdrawalAllowance.mockReturnValue({ allowance: { policy: 'BLOCK_IF_OVERDUE', withdrawableCents: 0, openDebtCents: 5000 } });
        mockUseGetAdvancesSummary.mockReturnValue({ summary: { totalPending: 5000, count: 1, overdueCount: 1 } });
        const tree = render();
        expect(tree.root.findAllByProps({ children: `Valor mínimo: ${formatCurrency(100)}` })).toHaveLength(0);
    });

    // Achado 1 da revisão final: /wallet/advances/summary falhou (overdueCount null), mas a
    // resposta da política diz teto 0 com disponível > 0 — o bloqueio está provado.
    it('BLOCK_IF_OVERDUE com o resumo de dívidas falho e bloqueio provado: aviso de bloqueio, sem "Valor mínimo"', () => {
        mockUseWithdrawalAllowance.mockReturnValue({
            allowance: { policy: 'BLOCK_IF_OVERDUE', withdrawableCents: 0, openDebtCents: 5000, availableCents: 10000 },
        });
        mockUseGetAdvancesSummary.mockReturnValue({ summary: undefined });
        const tree = render();

        const aviso = tree.root.findAllByProps({ testID: 'aviso-politica-divida-texto' })[0];
        expect(aviso.props.children).toBe('Saque bloqueado: você tem dívida vencida com a empresa. Devolva o valor para liberar o saque.');
        expect(aviso.props.color).toBe('colorTextError');
        expect(tree.root.findAllByProps({ children: `Valor mínimo: ${formatCurrency(100)}` })).toHaveLength(0);
        expect(tree.root.findAllByProps({ testID: 'sacar-tudo' })[0].props.disabled).toBe(true);
    });

    it('sem aviso de bloqueio: o "Valor mínimo" continua aparecendo', () => {
        const tree = render();
        expect(tree.root.findAllByProps({ children: `Valor mínimo: ${formatCurrency(100)}` }).length).toBeGreaterThan(0);
    });

    it('resumo da política indisponível: teto é o disponível e nenhum aviso inventado', () => {
        mockUseWithdrawalAllowance.mockReturnValue({ allowance: null });
        const tree = render();
        expect(campo(tree).props.maxCents).toBe(10000);
        expect(tree.root.findAllByProps({ testID: 'aviso-politica-divida' })).toHaveLength(0);
    });

    it('"Sacar tudo" preenche o teto da política, não o disponível', () => {
        mockUseWithdrawalAllowance.mockReturnValue({ allowance: { policy: 'EXCESS_ONLY', withdrawableCents: 7000, openDebtCents: 3000 } });
        const tree = render();
        act(() => {
            tree.root.findAllByProps({ testID: 'sacar-tudo' })[0].props.onPress();
        });
        expect(campo(tree).props.valueCents).toBe(7000);
    });

    it('saldo fracionado sem política: acima do teto diz "saldo insuficiente", nunca "regra de dívidas"', () => {
        mockUseGetWallet.mockReturnValue({
            wallet: { availableBalance: 10000.7, hasBankInfo: true, balance: 10000.7 },
            isLoading: false,
            isError: false,
            refetch: mockRefetchWallet,
        });
        const tree = render();
        digitarEPedir(tree, 10001);

        expect(mockModalProps?.isVisible).toBe(false);
        expect(mockShowToast).toHaveBeenCalledWith({ message: 'Saldo insuficiente para este saque', type: 'error' });
        expect(tree.root.findAllByProps({ children: `Máximo pela regra de dívidas: ${formatCurrency(10000)}` })).toHaveLength(0);
        expect(tree.root.findAllByProps({ children: 'Valor maior que o saldo disponível' }).length).toBeGreaterThan(0);
    });

    // Achado 2 da revisão final: /wallet e /wallet/summary são de momentos diferentes; com
    // política FREE o teto menor é só atraso do resumo, nunca "regra de dívidas".
    it('política FREE com o resumo atrasado (teto < disponível): acima do teto diz "saldo insuficiente", nunca "regra de dívidas"', () => {
        mockUseWithdrawalAllowance.mockReturnValue({ allowance: { policy: 'FREE', withdrawableCents: 7000, openDebtCents: 0, availableCents: 7000 } });
        const tree = render();
        digitarEPedir(tree, 8000);

        expect(mockModalProps?.isVisible).toBe(false);
        expect(mockShowToast).toHaveBeenCalledWith({ message: 'Saldo insuficiente para este saque', type: 'error' });
        expect(tree.root.findAllByProps({ children: `Máximo pela regra de dívidas: ${formatCurrency(7000)}` })).toHaveLength(0);
        expect(tree.root.findAllByProps({ children: 'Valor maior que o saldo disponível' }).length).toBeGreaterThan(0);
    });

    it('teto baixa com o modal aberto: Confirmar não manda o POST', async () => {
        mockUseWithdrawalAllowance.mockReturnValue({ allowance: { policy: 'EXCESS_ONLY', withdrawableCents: 7000, openDebtCents: 3000 } });
        const tree = render();
        digitarEPedir(tree, 5000);
        expect(mockModalProps?.isVisible).toBe(true);

        mockUseWithdrawalAllowance.mockReturnValue({ allowance: { policy: 'EXCESS_ONLY', withdrawableCents: 3000, openDebtCents: 7000 } });
        act(() => {
            tree.update(
                <ThemeProvider theme={theme}>
                    <SaqueScreen />
                </ThemeProvider>,
            );
        });
        await act(async () => {
            await mockModalProps!.onPress!();
        });

        expect(mockRequestWithdrawal).not.toHaveBeenCalled();
        expect(mockShowToast).toHaveBeenCalledWith({
            message: `Pela regra de dívidas da empresa, o máximo agora é ${formatCurrency(3000)}`,
            type: 'error',
        });
    });

    it('modal mostra o destino e o alerta de chave trocada recentemente', () => {
        mockUseGetWallet.mockReturnValue({
            wallet: {
                availableBalance: 10000,
                hasBankInfo: true,
                balance: 10000,
                pixKey: 'nova@exemplo.com',
                pixKeyChangedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
                previousPixKeyMasked: '*******1234',
            },
            isLoading: false,
            isError: false,
            refetch: mockRefetchWallet,
        });
        const tree = render();
        digitarEPedir(tree, 5000);

        expect(mockModalProps?.isVisible).toBe(true);
        expect(mockModalProps?.text).toContain('Destino: PIX: nova@exemplo.com');
        expect(mockModalProps?.text).toContain('(a chave atual da sua carteira)');
        expect(mockModalProps?.text).toContain('Atenção: A chave PIX da sua carteira foi alterada em');
    });

    // Achado 3 da revisão final: destino TED não é "chave".
    it('destino TED: o modal fala dos dados atuais da carteira, não da chave', () => {
        mockUseGetWallet.mockReturnValue({
            wallet: {
                availableBalance: 10000,
                hasBankInfo: true,
                balance: 10000,
                pixKey: null,
                bankName: 'Banco X',
                bankAgency: '0001',
                bankAccount: '12345-6',
            },
            isLoading: false,
            isError: false,
            refetch: mockRefetchWallet,
        });
        const tree = render();
        digitarEPedir(tree, 5000);

        expect(mockModalProps?.isVisible).toBe(true);
        expect(mockModalProps?.text).toContain('Destino: TED: Banco X · Ag. 0001 · Conta 12345-6\n(os dados atuais da sua carteira)');
        expect(mockModalProps?.text).not.toContain('chave atual');
    });
});
