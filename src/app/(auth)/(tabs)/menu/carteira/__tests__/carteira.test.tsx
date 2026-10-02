/**
 * Carteira: os quatro saldos vêm do GET /wallet, sem soma no cliente (F2). A dívida
 * aparece em cartão próprio e NÃO é descontada do disponível (regra-mãe 3). Um erro
 * só nos adiantamentos não derruba a carteira (auditoria, Bug 9).
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
jest.mock('expo-router', () => ({
    useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
    router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));

const mockUseGetWallet = jest.fn();
const mockUseGetAdvancesSummary = jest.fn();
jest.mock('@/domain/agility/wallet', () => ({
    useGetWallet: () => mockUseGetWallet(),
    useGetAdvancesSummary: () => mockUseGetAdvancesSummary(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const CarteiraScreen = require('../index').default;

const CARTEIRA = {
    id: 'w-1',
    driverId: 'd-1',
    balance: 20000,
    freightPendingBalance: 5000,
    withdrawalPendingBalance: 3000,
    blockedBalance: 8000,
    availableBalance: 12000,
    hasBankInfo: false,
    isActive: true,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
};

function render(
    adiantamentos: Record<string, unknown> = { summary: { totalPending: 0, count: 0, overdueCount: 0 }, isError: false },
    carteira: Record<string, unknown> = {},
) {
    mockUseGetWallet.mockReturnValue({ wallet: { ...CARTEIRA, ...carteira }, isLoading: false, isError: false, refetch: jest.fn(), isRefetching: false });
    mockUseGetAdvancesSummary.mockReturnValue({ refetch: jest.fn(), ...adiantamentos });
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
        tree = TestRenderer.create(
            <ThemeProvider theme={theme}>
                <CarteiraScreen />
            </ThemeProvider>,
        );
    });
    return tree;
}

const texto = (tree: TestRenderer.ReactTestRenderer, testID: string) => tree.root.findAllByProps({ testID })[0]?.props.children;
const todosOsTextos = (tree: TestRenderer.ReactTestRenderer) =>
    tree.root.findAll((n) => typeof n.props?.children === 'string').map((n) => n.props.children as string);

describe('Carteira', () => {
    it('mostra disponível, frete a liberar, saque pendente e total do GET /wallet', () => {
        const tree = render();
        expect(texto(tree, 'saldo-disponivel')).toBe(formatCurrency(12000));
        expect(texto(tree, 'frete-a-liberar')).toBe(formatCurrency(5000));
        expect(texto(tree, 'saque-pendente')).toBe(formatCurrency(3000));
        expect(texto(tree, 'saldo-total')).toBe(formatCurrency(20000));
    });

    it('o card antigo de recebíveis e o "saldo disponível real" não existem mais', () => {
        const tree = render({ summary: { totalPending: 3000, count: 1, overdueCount: 0 }, isError: false });
        const textos = todosOsTextos(tree);
        expect(textos).not.toContain('Recebíveis aguardando confirmação');
        expect(textos).not.toContain('Saldo disponível real');
    });

    it('dívida aparece à parte e não é descontada do disponível', () => {
        const tree = render({ summary: { totalPending: 3000, count: 1, overdueCount: 0 }, isError: false });
        expect(texto(tree, 'adiantamentos-a-devolver')).toBe(formatCurrency(3000));
        expect(texto(tree, 'saldo-disponivel')).toBe(formatCurrency(12000));
    });

    it('erro só nos adiantamentos mantém a carteira e avisa o erro, sem dizer que não deve nada', () => {
        const tree = render({ summary: undefined, isError: true });
        expect(texto(tree, 'saldo-disponivel')).toBe(formatCurrency(12000));
        expect(tree.root.findAllByProps({ testID: 'adiantamentos-erro' }).length).toBeGreaterThan(0);
    });

    it('chave PIX trocada há 1 hora: alerta no topo com a chave anterior mascarada', () => {
        const tree = render(undefined, {
            hasBankInfo: true,
            pixKey: 'nova@exemplo.com',
            pixKeyChangedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
            previousPixKeyMasked: '*******1234',
        });
        expect(tree.root.findAllByProps({ testID: 'aviso-chave-pix' }).length).toBeGreaterThan(0);
        expect(texto(tree, 'aviso-chave-pix-texto')).toContain('A anterior era *******1234.');
        expect(texto(tree, 'aviso-chave-pix-texto')).toContain('Se não foi você, fale com a central');
        expect(texto(tree, 'aviso-chave-pix-texto')).toContain('foi alterada em');
    });

    it('primeiro cadastro recente: o alerta diz "cadastrada", nunca "alterada"', () => {
        const tree = render(undefined, {
            hasBankInfo: true,
            pixKey: 'nova@exemplo.com',
            pixKeyChangedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
            previousPixKeyMasked: null,
        });
        expect(texto(tree, 'aviso-chave-pix-texto')).toContain('foi cadastrada em');
        expect(texto(tree, 'aviso-chave-pix-texto')).not.toContain('alterada');
    });

    it('chave removida há 1 hora: o alerta diz "removida"', () => {
        const tree = render(undefined, {
            hasBankInfo: true,
            pixKey: null,
            pixKeyChangedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
            previousPixKeyMasked: '*******1234',
        });
        expect(texto(tree, 'aviso-chave-pix-texto')).toContain('foi removida em');
    });

    it('chave removida há 30 dias: sem alerta e sem linha cinza (sem chave não há onde ancorar)', () => {
        const tree = render(undefined, {
            hasBankInfo: true,
            pixKey: null,
            pixKeyChangedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            previousPixKeyMasked: '*******1234',
        });
        expect(tree.root.findAllByProps({ testID: 'aviso-chave-pix' })).toHaveLength(0);
        expect(tree.root.findAllByProps({ testID: 'chave-pix-alterada-em' })).toHaveLength(0);
    });

    it('troca de 30 dias atrás: sem alerta, só o registro junto da chave', () => {
        const tree = render(undefined, {
            hasBankInfo: true,
            pixKey: 'nova@exemplo.com',
            pixKeyChangedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            previousPixKeyMasked: '*******1234',
        });
        expect(tree.root.findAllByProps({ testID: 'aviso-chave-pix' })).toHaveLength(0);
        expect(texto(tree, 'chave-pix-alterada-em')).toContain('foi alterada em');
    });

    it('sem troca registrada: nenhum aviso de chave', () => {
        const tree = render(undefined, { hasBankInfo: true, pixKey: 'nova@exemplo.com', pixKeyChangedAt: null, previousPixKeyMasked: null });
        expect(tree.root.findAllByProps({ testID: 'aviso-chave-pix' })).toHaveLength(0);
        expect(tree.root.findAllByProps({ testID: 'chave-pix-alterada-em' })).toHaveLength(0);
    });
});
