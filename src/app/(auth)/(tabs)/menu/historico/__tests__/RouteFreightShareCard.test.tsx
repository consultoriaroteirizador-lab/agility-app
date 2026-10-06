/**
 * "Sua parte nesta rota" (F6): o valor, as paradas e o status da parcela do motorista. Vazio some;
 * erro avisa e tenta de novo; nunca ids.
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

const mockUseDriverFreightShares = jest.fn();
jest.mock('@/domain/agility/wallet', () => ({
    useDriverFreightShares: (...args: unknown[]) => mockUseDriverFreightShares(...args),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { RouteFreightShareCard } = require('../_components/RouteFreightShareCard');

function render(routingId = 'r-0000-1111') {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
        tree = TestRenderer.create(
            <ThemeProvider theme={theme}>
                <RouteFreightShareCard routingId={routingId} />
            </ThemeProvider>,
        );
    });
    return tree;
}

const parcela = {
    id: 's-1', routingId: 'r-0000-1111', routingCode: 'LMR-1', routingName: 'Zona Sul', status: 'LIBERADA',
    stopsCompleted: 8, stopsTotal: 10, valueMode: 'TOTAL', fullAmountCents: 20000, amountToReleaseCents: 0,
    releasedAmountCents: 15000, releasedAt: '2026-10-06T12:00:00.000Z', adjustReason: 'atraso na coleta',
    cancelledAt: null, cancelReason: null, createdAt: '2026-10-05T12:00:00.000Z',
};

/** Os textos renderizados (o `toJSON` com componentes nativos pode ter estrutura circular). */
const textos = (tree: TestRenderer.ReactTestRenderer) =>
    tree.root
        .findAll((n) => typeof n.props.children === 'string')
        .map((n) => n.props.children as string)
        .join(' | ');

beforeEach(() => jest.clearAllMocks());

describe('RouteFreightShareCard', () => {
    it('pede as parcelas DESTA rota', () => {
        mockUseDriverFreightShares.mockReturnValue({ page: null, isLoading: true, isError: false, refetch: jest.fn() });
        render('r-0000-1111');
        expect(mockUseDriverFreightShares).toHaveBeenCalledWith({ routingId: 'r-0000-1111' }, { enabled: true });
    });

    it('mostra o valor, as paradas, o status e o motivo do ajuste; nunca ids', () => {
        mockUseDriverFreightShares.mockReturnValue({ page: { data: [parcela], meta: { page: 1, totalPages: 1, total: 1 } }, isLoading: false, isError: false, refetch: jest.fn() });
        const t = textos(render());
        expect(t).toContain('Sua parte nesta rota');
        expect(t).toContain('8 de 10 paradas');
        expect(t).toContain('Liberado');
        expect(t).toContain('Ajuste da empresa: atraso na coleta');
        expect(t).toContain(formatCurrency(15000));
        expect(t).not.toMatch(/\bs-1\b|r-0000-1111/);
    });

    it('lista vazia (rota sem frete para ele): o cartão não aparece', () => {
        mockUseDriverFreightShares.mockReturnValue({ page: { data: [], meta: { page: 1, totalPages: 1, total: 0 } }, isLoading: false, isError: false, refetch: jest.fn() });
        const tree = render();
        expect(tree.toJSON()).toBeNull();
    });

    it('erro: avisa e tenta de novo no toque, não some', () => {
        const refetch = jest.fn();
        mockUseDriverFreightShares.mockReturnValue({ page: null, isLoading: false, isError: true, refetch });
        const tree = render();
        expect(textos(tree)).toContain('Não foi possível carregar sua parte nesta rota. Toque para tentar de novo.');
        act(() => tree.root.findAllByProps({ testID: 'parte-da-rota-erro' })[0].props.onPress());
        expect(refetch).toHaveBeenCalled();
    });
});
