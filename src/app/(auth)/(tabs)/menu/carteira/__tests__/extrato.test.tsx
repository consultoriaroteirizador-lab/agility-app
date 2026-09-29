/**
 * Extrato da carteira.
 *
 * Contratos guardados:
 * 1. comprovante: o link so aparece quando ha comprovante e abre a URL; CHAVE crua do
 *    storage nao vira link (decisao do dono, 21/09/2026);
 * 2. sinal pela direcao (F2), selo de status, movimento entre baldes sem sinal;
 * 3. erro nao e vazio; filtro sem resultado entre as carregadas oferece carregar mais.
 */
import React from 'react';
import { Linking } from 'react-native';

import { ThemeProvider } from '@shopify/restyle';
import TestRenderer, { act } from 'react-test-renderer';

import { theme } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';

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
// Os icones locais sao .svg, transformados pelo metro e NAO pelo jest.
jest.mock('@/components/Icon/LocalIcon', () => ({ LocalIcon: () => null }));
// `@expo/vector-icons` carrega a fonte de forma assincrona (aviso de act()).
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
// `ButtonBack` usa o objeto `router` (nao o hook), entao os dois precisam existir.
jest.mock('expo-router', () => ({
    useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
    router: { push: jest.fn(), back: jest.fn() },
}));

const mockShowToast = jest.fn();
jest.mock('@/services/Toast/useToast', () => ({ useToastService: () => ({ showToast: mockShowToast }) }));

const mockUseInfiniteTransactions = jest.fn();
jest.mock('@/domain/agility/wallet', () => ({
    useInfiniteTransactions: (...args: unknown[]) => mockUseInfiniteTransactions(...args),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ExtratoScreen = require('../extrato').default;

const URL_ASSINADA = 'https://s3.exemplo.com/comprovante.pdf?X-Amz-Signature=abc';
const mockLoadMore = jest.fn();

function transacao(over: Record<string, unknown> = {}) {
    return {
        id: 'tx-1',
        walletId: 'w-1',
        type: 'WITHDRAWAL',
        direction: 'OUT',
        affectsBalance: true,
        status: 'COMPLETED',
        amount: 5000,
        balanceAfter: 1000,
        description: 'Saque pago',
        sourceType: 'WITHDRAWAL',
        sourceId: 'wd-1',
        isCredit: false,
        isDebit: true,
        withdrawalId: 'wd-1',
        createdAt: '2026-09-21T12:00:00.000Z',
        ...over,
    };
}

function renderExtrato(transactions: Record<string, unknown>[], estado: Record<string, unknown> = {}) {
    mockUseInfiniteTransactions.mockReturnValue({
        items: transactions,
        isLoading: false,
        isError: false,
        isFetchNextPageError: false,
        hasNextPage: false,
        isFetchingNextPage: false,
        loadMore: mockLoadMore,
        refetch: jest.fn(),
        isRefreshing: false,
        ...estado,
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
const porTestId = (tree: TestRenderer.ReactTestRenderer, testID: string) => tree.root.findAllByProps({ testID });
const texto = (tree: TestRenderer.ReactTestRenderer, testID: string) => porTestId(tree, testID)[0]?.props.children;

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
        expect(porTestId(tree, 'comprovante-tx-1-0').length).toBeGreaterThan(0);
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
        expect(porTestId(tree, 'comprovante-tx-1-0').length).toBeGreaterThan(0);
        expect(porTestId(tree, 'comprovante-tx-1-1').length).toBeGreaterThan(0);
    });

    it('falha ao abrir avisa o motorista em vez de nao fazer nada', async () => {
        (Linking.openURL as jest.Mock).mockRejectedValue(new Error('sem app'));
        const tree = renderExtrato([transacao({ proofUrls: [URL_ASSINADA] })]);
        await act(async () => {
            links(tree)[0].props.onPress();
        });
        expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
    });
});

describe('Extrato — sinal, status e estados', () => {
    it('credito manual aparece com "+" (sinal pela direcao, nao por isCredit/tipo)', () => {
        const tree = renderExtrato([
            transacao({ id: 'tx-2', type: 'MANUAL_CREDIT', direction: 'IN', isCredit: false, sourceType: 'MANUAL' }),
        ]);
        expect(texto(tree, 'valor-tx-2')).toBe(`+${formatCurrency(5000)}`);
    });

    it('frete liberado aparece sem sinal e com o movimento entre baldes', () => {
        const tree = renderExtrato([
            transacao({ id: 'tx-3', type: 'FREIGHT_RELEASE', direction: 'IN', affectsBalance: false, sourceType: 'FREIGHT_SHARE_RELEASE' }),
        ]);
        expect(texto(tree, 'valor-tx-3')).toBe(formatCurrency(5000));
        expect(texto(tree, 'movimento-tx-3')).toBe('Frete a liberar → Disponível');
    });

    it('lancamento pendente ganha selo', () => {
        const tree = renderExtrato([transacao({ id: 'tx-4', status: 'PENDING' })]);
        expect(texto(tree, 'status-tx-4')).toBe('Pendente');
    });

    it('erro sem nada carregado mostra erro, nao "nenhuma movimentacao"', () => {
        const tree = renderExtrato([], { isError: true });
        expect(porTestId(tree, 'extrato-erro').length).toBeGreaterThan(0);
        expect(porTestId(tree, 'extrato-vazio')).toHaveLength(0);
    });

    it('falha so na proxima pagina mantem a lista e oferece tentar de novo', () => {
        const tree = renderExtrato([transacao()], { isError: true, isFetchNextPageError: true, hasNextPage: true });
        expect(porTestId(tree, 'valor-tx-1').length).toBeGreaterThan(0);
        act(() => {
            porTestId(tree, 'extrato-erro-mais')[0].props.onPress();
        });
        expect(mockLoadMore).toHaveBeenCalled();
    });

    it('filtro sem resultado entre as carregadas oferece carregar mais, em vez de dizer que nao existe', () => {
        const tree = renderExtrato([transacao()], { hasNextPage: true });
        act(() => {
            porTestId(tree, 'filtro-freight')[0].props.onPress();
        });
        expect(texto(tree, 'extrato-vazio')).toBe('Nenhuma movimentação de fretes entre as carregadas.');
        act(() => {
            porTestId(tree, 'extrato-carregar-mais')[0].props.onPress();
        });
        expect(mockLoadMore).toHaveBeenCalled();
    });
});
