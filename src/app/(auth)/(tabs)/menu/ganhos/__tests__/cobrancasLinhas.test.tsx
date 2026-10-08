/**
 * Cobranças: as linhas da F6 aparecem na tela (forma de pagamento, cancelamento pela empresa,
 * quanto falta devolver e o vencimento) e nenhum id chega ao motorista. A lógica de cada linha
 * está em `paymentDisplay.test.ts`; aqui a prova é que a tela desenha o que o util devolve.
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
    useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
    router: { push: jest.fn(), back: jest.fn() },
    useFocusEffect: jest.fn(),
}));

const mockItems: unknown[] = [];
jest.mock('@/domain/agility/wallet', () => ({
    useGetAdvancesSummary: () => ({ summary: undefined, isError: false, refetch: jest.fn() }),
}));
jest.mock('@/domain/agility/finance', () => ({
    useInfinitePayments: () => ({
        items: mockItems,
        isLoading: false,
        isError: false,
        isFetchNextPageError: false,
        isFetchingNextPage: false,
        loadMore: jest.fn(),
        refetch: jest.fn(),
        isRefreshing: false,
    }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const CobrancasScreen = require('../cobrancas').default;

const base = {
    companyId: 'cmp-0000', routingId: 'rot-2222', serviceId: 'svc-3333', driverId: 'drv-4444', customerId: 'cli-7777',
    serviceTitle: 'Pedido 77', routingName: 'Zona Norte', routingCode: 'LMR-9',
    createdAt: '2026-10-05T12:00:00.000Z', updatedAt: '2026-10-05T12:00:00.000Z',
};

const dinheiroVencido = {
    ...base, id: 'pay-1111', customerName: 'Mercado Bom Preço', status: 'APPROVED', expectedValue: 15000, receivedValue: 15000,
    paymentMethod: 'CASH', cancelledAt: null, cancelReason: null,
    debt: {
        advanceId: 'adv-5555', status: 'PARTIAL', amountCents: 15000, returnedAmountCents: 5000, pendingAmountCents: 10000,
        dueDate: '2026-10-01T12:00:00.000Z', isOverdue: true,
    },
};

const dinheiroNoPrazo = {
    ...base, id: 'pay-2222', customerName: 'Padaria Sol', status: 'APPROVED', expectedValue: 4000, receivedValue: 4000,
    paymentMethod: 'CASH', cancelledAt: null, cancelReason: null,
    debt: {
        advanceId: 'adv-6666', status: 'PENDING', amountCents: 4000, returnedAmountCents: 0, pendingAmountCents: 4000,
        dueDate: '2026-10-20T12:00:00.000Z', isOverdue: false,
    },
};

const cancelado = {
    ...base, id: 'pay-3333', customerName: 'Loja Azul', status: 'REJECTED', expectedValue: 9000, receivedValue: 9000,
    paymentMethod: 'PIX', cancelledAt: '2026-10-05T15:00:00.000Z', cancelReason: 'pedido devolvido', debt: null,
};

/** Todo texto desenhado, inclusive o montado em partes dentro de um mesmo <Text>. */
function textos(tree: TestRenderer.ReactTestRenderer): string[] {
    const out: string[] = [];
    const visitar = (n: TestRenderer.ReactTestRendererNode | TestRenderer.ReactTestRendererNode[] | null) => {
        if (n === null) return;
        if (Array.isArray(n)) return n.forEach(visitar);
        if (typeof n === 'string') return void out.push(n);
        (n.children ?? []).forEach(visitar);
    };
    visitar(tree.toJSON());
    return out;
}

function render() {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
        tree = TestRenderer.create(
            <ThemeProvider theme={theme}>
                <CobrancasScreen />
            </ThemeProvider>,
        );
    });
    return tree;
}

beforeEach(() => {
    mockItems.splice(0, mockItems.length, dinheiroVencido, dinheiroNoPrazo, cancelado);
});

describe('Cobranças — linhas da F6 na tela', () => {
    it('mostra a forma de pagamento', () => {
        const t = textos(render());
        expect(t).toContain('Forma: Dinheiro');
        expect(t).toContain('Forma: PIX');
    });

    it('cancelado pela empresa mostra o motivo', () => {
        expect(textos(render())).toContain('Cancelado pela empresa: pedido devolvido');
    });

    it('dívida vencida: quanto falta devolver, "Venceu em", em vermelho', () => {
        const tree = render();
        const linha = tree.root.findByProps({ testID: 'divida-pay-1111' });
        expect(linha.props.color).toBe('colorTextError');
        expect(textos(tree).some((s) => s.startsWith(`A devolver: ${formatCurrency(10000)} · Venceu em `))).toBe(true);
    });

    it('dívida no prazo: "Vence em", em amarelo', () => {
        const tree = render();
        const linha = tree.root.findByProps({ testID: 'divida-pay-2222' });
        expect(linha.props.color).toBe('colorTextWarning');
        expect(textos(tree).some((s) => s.startsWith(`A devolver: ${formatCurrency(4000)} · Vence em `))).toBe(true);
    });

    it('nenhum id na tela (cobrança, rota, pedido, motorista, cliente, empresa, dívida)', () => {
        const t = textos(render()).join(' | ');
        expect(t).toContain('Zona Norte');
        expect(t).not.toMatch(/pay-|rot-|svc-|drv-|cli-|cmp-|adv-/);
    });
});
