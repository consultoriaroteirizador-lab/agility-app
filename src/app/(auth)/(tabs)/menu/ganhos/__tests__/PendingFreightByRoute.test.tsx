/**
 * "Fretes a liberar por rota" (F6): de quais rotas vem o "Frete a liberar". Erro não é vazio.
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
const { PendingFreightByRoute } = require('../_components/PendingFreightByRoute');

function render() {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
        tree = TestRenderer.create(
            <ThemeProvider theme={theme}>
                <PendingFreightByRoute />
            </ThemeProvider>,
        );
    });
    return tree;
}

const parcela = {
    id: 's-1', routingId: 'r-0000-1111', routingCode: 'LMR-1', routingName: 'Zona Sul', status: 'A_LIBERAR',
    stopsCompleted: 8, stopsTotal: 10, valueMode: 'TOTAL', fullAmountCents: 20000, amountToReleaseCents: 16000,
    releasedAmountCents: null, releasedAt: null, adjustReason: null, cancelledAt: null, cancelReason: null,
    createdAt: '2026-10-05T12:00:00.000Z',
};

const textos = (tree: TestRenderer.ReactTestRenderer) =>
    tree.root
        .findAll((n) => typeof n.props.children === 'string')
        .map((n) => n.props.children as string)
        .join(' | ');

beforeEach(() => jest.clearAllMocks());

describe('PendingFreightByRoute', () => {
    it('pede só as parcelas A_LIBERAR', () => {
        mockUseDriverFreightShares.mockReturnValue({ page: null, isLoading: true, isError: false, refetch: jest.fn() });
        render();
        expect(mockUseDriverFreightShares).toHaveBeenCalledWith({ status: 'A_LIBERAR' });
    });

    it('lista rota, paradas e valor bloqueado; nunca ids', () => {
        mockUseDriverFreightShares.mockReturnValue({
            page: { data: [parcela], meta: { page: 1, totalPages: 1, total: 1 } },
            isLoading: false, isError: false, refetch: jest.fn(),
        });
        const t = textos(render());
        expect(t).toContain('Fretes a liberar por rota');
        expect(t).toContain('Zona Sul');
        expect(t).toContain('8 de 10 paradas');
        expect(t).toContain(formatCurrency(16000));
        expect(t).not.toMatch(/\bs-1\b|r-0000-1111/);
    });

    it('mais do que a página: "Mostrando 50 de 73"', () => {
        const data = Array.from({ length: 50 }, (_, i) => ({ ...parcela, id: `s-${i}` }));
        mockUseDriverFreightShares.mockReturnValue({ page: { data, meta: { page: 1, totalPages: 2, total: 73 } }, isLoading: false, isError: false, refetch: jest.fn() });
        expect(textos(render())).toContain('Mostrando 50 de 73.');
    });

    it('vazio diz que nada espera liberação', () => {
        mockUseDriverFreightShares.mockReturnValue({ page: { data: [], meta: { page: 1, totalPages: 1, total: 0 } }, isLoading: false, isError: false, refetch: jest.fn() });
        expect(textos(render())).toContain('Nenhum frete esperando liberação.');
    });

    it('erro: avisa e tenta de novo no toque, nunca "nenhum"', () => {
        const refetch = jest.fn();
        mockUseDriverFreightShares.mockReturnValue({ page: null, isLoading: false, isError: true, refetch });
        const tree = render();
        expect(textos(tree)).not.toContain('Nenhum frete');
        act(() => tree.root.findAllByProps({ testID: 'a-liberar-erro' })[0].props.onPress());
        expect(refetch).toHaveBeenCalled();
    });
});
