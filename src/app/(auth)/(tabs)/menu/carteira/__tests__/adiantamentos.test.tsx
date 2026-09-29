/**
 * Com a API fora, a tela NÃO pode dizer "nenhum adiantamento" (antes: ✓ verde, o motorista
 * achava que não devia nada — auditoria, Bug 9).
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
jest.mock('expo-router', () => ({
    useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
    router: { push: jest.fn(), back: jest.fn() },
}));

const mockUseInfiniteAdvances = jest.fn();
const mockUseGetAdvancesSummary = jest.fn();
jest.mock('@/domain/agility/wallet', () => ({
    useInfiniteAdvances: () => mockUseInfiniteAdvances(),
    useGetAdvancesSummary: () => mockUseGetAdvancesSummary(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const AdiantamentosScreen = require('../adiantamentos').default;

const LISTA_OK = {
    items: [],
    isLoading: false,
    isError: false,
    isFetchNextPageError: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    loadMore: jest.fn(),
    refetch: jest.fn(),
    isRefreshing: false,
};

function render(lista: Record<string, unknown>, resumo: Record<string, unknown>) {
    mockUseInfiniteAdvances.mockReturnValue({ ...LISTA_OK, ...lista });
    mockUseGetAdvancesSummary.mockReturnValue({ refetch: jest.fn(), ...resumo });
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
        tree = TestRenderer.create(
            <ThemeProvider theme={theme}>
                <AdiantamentosScreen />
            </ThemeProvider>,
        );
    });
    return tree;
}

const existe = (tree: TestRenderer.ReactTestRenderer, testID: string) => tree.root.findAllByProps({ testID }).length > 0;

describe('Adiantamentos', () => {
    it('lista com erro mostra erro, não "nenhum adiantamento"', () => {
        const tree = render({ isError: true }, { summary: undefined, isError: true });
        expect(existe(tree, 'adiantamentos-erro')).toBe(true);
        expect(existe(tree, 'adiantamentos-vazio')).toBe(false);
    });

    it('resumo com erro não mostra total zerado', () => {
        const tree = render({ items: [] }, { summary: undefined, isError: true });
        expect(existe(tree, 'resumo-erro')).toBe(true);
        expect(existe(tree, 'resumo-total')).toBe(false);
    });

    it('mostra o vencimento e esconde o id do serviço da dívida de cobrança', () => {
        const tree = render(
            {
                items: [
                    {
                        id: 'a-1',
                        amount: 5000,
                        pendingAmount: 5000,
                        returnedAmount: 0,
                        status: 'PENDING',
                        description: 'Dinheiro recebido no service 2f6c1c8e-1111 — devolução pendente',
                        dueDate: '2026-09-30T00:00:00.000Z',
                        isOverdue: false,
                        createdAt: '2026-09-23T12:00:00.000Z',
                    },
                ],
            },
            { summary: { totalPending: 5000, count: 1, overdueCount: 0 }, isError: false },
        );
        expect(tree.root.findAllByProps({ testID: 'vencimento-a-1' })[0].props.children).toBe('Vence em 30/09/2026');
        expect(tree.root.findAllByProps({ testID: 'titulo-a-1' })[0].props.children).toBe('Dinheiro recebido de cliente');
    });
});
