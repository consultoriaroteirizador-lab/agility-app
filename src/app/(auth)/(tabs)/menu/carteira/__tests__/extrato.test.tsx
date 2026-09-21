/**
 * Comprovante do saque no extrato da carteira.
 *
 * Decisao do dono (21/09/2026): o escritorio anexa o comprovante ao processar o
 * saque, e o motorista ve esse comprovante no proprio extrato.
 *
 * Este teste guarda dois contratos:
 *
 * 1. o link so aparece quando ha comprovante, e tocar nele abre a URL;
 * 2. CHAVE crua do storage nao vira link. O backend assina a URL na listagem;
 *    se a assinatura falhar e a chave vazar, um botao que leva a lugar nenhum e
 *    pior do que nenhum botao.
 */
import React from 'react';
import { Linking } from 'react-native';

import { ThemeProvider } from '@shopify/restyle';
import TestRenderer, { act } from 'react-test-renderer';

import { theme } from '@/theme';

// --- Mocks de leaf ----------------------------------------------------------
// O barrel de @/components arrasta WebView, AsyncStorage e o SDK de geolocation
// (modulos nativos) so pelo import.
jest.mock('react-native-webview', () => ({ WebView: () => null }));
jest.mock('@react-native-async-storage/async-storage', () =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-background-geolocation', () => ({
    __esModule: true,
    default: { ready: jest.fn(), onLocation: jest.fn(), removeListeners: jest.fn() },
}));

// Os icones locais sao .svg, transformados pelo metro (react-native-svg-transformer)
// e NAO pelo jest: sem este mock eles chegam como objeto e o React recusa
// renderizar. Nao ha icone nenhum sob teste aqui.
jest.mock('@/components/Icon/LocalIcon', () => ({ LocalIcon: () => null }));

// `@expo/vector-icons` carrega a fonte de forma assincrona e da setState depois
// do render, o que enche a saida de aviso de act(). Nenhum icone e asserido
// aqui — o link e achado por testID e por accessibilityLabel.
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

// `ButtonBack` usa o objeto `router` (nao o hook), entao os dois precisam existir.
jest.mock('expo-router', () => ({
    useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
    router: { push: jest.fn(), back: jest.fn() },
}));

// Prefixo `mock` obrigatorio: o babel-plugin-jest-hoist iça os `jest.mock` para
// antes dos imports e recusa referencia a variavel de fora do escopo sem ele.
const mockShowToast = jest.fn();
jest.mock('@/services/Toast/useToast', () => ({ useToastService: () => ({ showToast: mockShowToast }) }));

const mockUseGetTransactions = jest.fn();
jest.mock('@/domain/agility/wallet', () => ({
    useGetTransactions: (...args: unknown[]) => mockUseGetTransactions(...args),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ExtratoScreen = require('../extrato').default;

const URL_ASSINADA = 'https://s3.exemplo.com/comprovante.pdf?X-Amz-Signature=abc';

function transacao(over: Record<string, unknown> = {}) {
    return {
        id: 'tx-1',
        walletId: 'w-1',
        type: 'DEBIT',
        status: 'COMPLETED',
        amount: 5000,
        balanceAfter: 1000,
        description: 'Saque',
        isCredit: false,
        isDebit: true,
        withdrawalId: 'wd-1',
        createdAt: '2026-09-21T12:00:00.000Z',
        ...over,
    };
}

function renderExtrato(transactions: Record<string, unknown>[]) {
    mockUseGetTransactions.mockReturnValue({
        transactions,
        meta: { page: 1, limit: 20, total: transactions.length, totalPages: 1 },
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        isRefetching: false,
    });

    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
        tree = TestRenderer.create(
            <ThemeProvider theme={theme}>
                <ExtratoScreen />
            </ThemeProvider>,
        );
    });
    return tree;
}

const links = (tree: TestRenderer.ReactTestRenderer) =>
    tree.root.findAllByProps({ accessibilityLabel: 'Abrir comprovante' });

beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
});

describe('Extrato — comprovante do saque', () => {
    it('sem comprovante, nao mostra link', () => {
        const tree = renderExtrato([transacao()]);

        expect(links(tree)).toHaveLength(0);
    });

    it('lista vazia de comprovantes tambem nao mostra link', () => {
        const tree = renderExtrato([transacao({ proofUrls: [] })]);

        expect(links(tree)).toHaveLength(0);
    });

    it('com comprovante, mostra o link', () => {
        const tree = renderExtrato([transacao({ proofUrls: [URL_ASSINADA] })]);

        expect(links(tree).length).toBeGreaterThan(0);
        expect(tree.root.findAllByProps({ testID: 'comprovante-tx-1-0' }).length).toBeGreaterThan(0);
    });

    it('tocar no link abre a URL assinada', () => {
        const tree = renderExtrato([transacao({ proofUrls: [URL_ASSINADA] })]);

        act(() => {
            links(tree)[0].props.onPress();
        });

        expect(Linking.openURL).toHaveBeenCalledWith(URL_ASSINADA);
    });

    it('CHAVE crua do storage NAO vira link', () => {
        const tree = renderExtrato([transacao({ proofUrls: ['services/empresa-1/finance/a.pdf'] })]);

        expect(links(tree)).toHaveLength(0);
    });

    it('mais de um comprovante vira mais de um link', () => {
        const tree = renderExtrato([
            transacao({ proofUrls: [URL_ASSINADA, 'https://s3.exemplo.com/b.png?X-Amz-Signature=def'] }),
        ]);

        expect(tree.root.findAllByProps({ testID: 'comprovante-tx-1-0' }).length).toBeGreaterThan(0);
        expect(tree.root.findAllByProps({ testID: 'comprovante-tx-1-1' }).length).toBeGreaterThan(0);
    });

    it('falha ao abrir avisa o motorista em vez de nao fazer nada', async () => {
        (Linking.openURL as jest.Mock).mockRejectedValue(new Error('sem app'));
        const tree = renderExtrato([transacao({ proofUrls: [URL_ASSINADA] })]);

        await act(async () => {
            links(tree)[0].props.onPress();
        });

        expect(mockShowToast).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'error' }),
        );
    });
});
