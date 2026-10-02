/**
 * `Routing.totalValue` é REAIS (não centavos, ao contrário do resto do dinheiro do app).
 * O card da home formata com o `formatCurrency` LOCAL de `_rotas/utils/format`, que não
 * divide por 100. Trocar pelo `@/utils/formatCurrency` (centavos) faria R$ 850 virar R$ 8,50:
 * este teste segura essa troca (achado 5 da revisão final da F5b).
 */
import React from 'react';

import { ThemeProvider } from '@shopify/restyle';
import TestRenderer, { act } from 'react-test-renderer';

import type { RoutingResponse } from '@/domain/agility/routing/dto';
import { RoutingStatus } from '@/domain/agility/routing/dto/types';
import { theme } from '@/theme';

import { RouteItem } from '../RouteItem';

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

function renderRoute(totalValue: number) {
    const route = {
        id: 'rota-1',
        code: 'R-1',
        status: RoutingStatus.ASSIGNED,
        totalValue,
        totalServices: 3,
    } as unknown as RoutingResponse;
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
        tree = TestRenderer.create(
            <ThemeProvider theme={theme}>
                <RouteItem route={route} onPress={jest.fn()} />
            </ThemeProvider>,
        );
    });
    return tree;
}

const textos = (tree: TestRenderer.ReactTestRenderer) =>
    tree.root.findAll((n) => typeof n.props.children === 'string').map((n) => n.props.children as string);

describe('RouteItem — valor da rota', () => {
    it('totalValue em reais: R$ 850 aparece como R$ 850,00, não R$ 8,50', () => {
        const tree = renderRoute(850);
        expect(textos(tree)).toContain('R$ 850,00');
        expect(textos(tree)).not.toContain('R$ 8,50');
    });

    it('milhar com separador: 1234.5 reais vira R$ 1.234,50', () => {
        const tree = renderRoute(1234.5);
        expect(textos(tree)).toContain('R$ 1.234,50');
    });
});
