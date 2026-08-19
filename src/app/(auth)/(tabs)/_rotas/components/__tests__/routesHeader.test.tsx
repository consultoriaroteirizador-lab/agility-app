/**
 * Botao de atualizar no cabecalho da lista de rotas.
 *
 * Existe porque o pull-to-refresh e invisivel para quem nao conhece o gesto: o
 * motorista abria a home, via a lista velha e nao tinha como pedir a nova. Este
 * teste guarda dois contratos do botao — ele dispara o mesmo refresh do
 * puxar-para-atualizar, e enquanto a busca esta em voo ele fica desabilitado
 * (senao cada toque empilha uma requisicao) e mostra o spinner no lugar do icone.
 */
import React from 'react';

import { ThemeProvider } from '@shopify/restyle';
import TestRenderer, { act } from 'react-test-renderer';

import { ActivityIndicator } from '@/components';
import { theme } from '@/theme';

import { RoutesHeader } from '../RoutesHeader';

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

const REFRESH_TEST_ID = 'routes-header-refresh';

function renderHeader(props: { onRefresh?: () => void; isRefreshing?: boolean }) {
    let tree!: TestRenderer.ReactTestRenderer;

    act(() => {
        tree = TestRenderer.create(
            <ThemeProvider theme={theme}>
                <RoutesHeader {...props} />
            </ThemeProvider>,
        );
    });

    return tree;
}

function botaoRefresh(tree: TestRenderer.ReactTestRenderer) {
    return tree.root.findAllByProps({ testID: REFRESH_TEST_ID })[0];
}

describe('RoutesHeader — botao de atualizar', () => {
    it('dispara o refresh ao ser tocado', () => {
        const onRefresh = jest.fn();
        const tree = renderHeader({ onRefresh });

        act(() => {
            botaoRefresh(tree).props.onPress();
        });

        expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    it('fica desabilitado e mostra spinner enquanto atualiza', () => {
        const tree = renderHeader({ onRefresh: jest.fn(), isRefreshing: true });

        expect(botaoRefresh(tree).props.disabled).toBe(true);
        expect(tree.root.findAllByType(ActivityIndicator).length).toBe(1);
    });

    it('nao renderiza o botao quando a tela nao passa onRefresh', () => {
        const tree = renderHeader({});

        expect(tree.root.findAllByProps({ testID: REFRESH_TEST_ID })).toHaveLength(0);
    });
});
