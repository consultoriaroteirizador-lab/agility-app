/**
 * Oferta: os itens da parada no card da timeline mostram o compartimento (plano de carga, 5C).
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
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null, MaterialIcons: () => null }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ItensDaParada } = require('../ItensDaParada');

const itens = [{ id: 'l1', nome: 'Caixa A', quantidade: 2, unidade: 'un' }];

function render(compartimentoDe?: (id: string) => string | null) {
    let r!: TestRenderer.ReactTestRenderer;
    act(() => {
        r = TestRenderer.create(
            <ThemeProvider theme={theme}>
                <ItensDaParada titulo="Itens" itens={itens} onVerTodos={jest.fn()} compartimentoDe={compartimentoDe} />
            </ThemeProvider>,
        );
    });
    return r;
}

const temTexto = (r: TestRenderer.ReactTestRenderer, s: string) => r.root.findAll((n) => n.props.children === s).length > 0;

describe('ItensDaParada: compartimento do item na oferta', () => {
    it('mostra o compartimento embaixo do nome', () => {
        const r = render((id) => (id === 'l1' ? 'Compartimento 2' : null));
        expect(temTexto(r, 'Caixa A')).toBe(true);
        expect(temTexto(r, 'Compartimento 2')).toBe(true);
    });

    it('sem compartimento para o item, nada aparece', () => {
        const r = render(() => null);
        expect(temTexto(r, 'Caixa A')).toBe(true);
        expect(r.root.findAll((n) => n.props.children === 'Compartimento 2').length).toBe(0);
    });
});
