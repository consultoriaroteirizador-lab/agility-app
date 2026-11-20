/**
 * Parada agrupada: o card da nota expandida mostra o compartimento de cada linha (plano de carga, 5C).
 * Sem a prop `compartimentoDe` (lote de transferência CD→CD) nada muda.
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

jest.mock('@/domain/agility/service/useCase/useGetServiceLines', () => ({
    useGetServiceLines: () => ({
        lines: [{ id: 'l1', material: 'Caixa A', quantity: 2, unit: 'un' }],
        isLoading: false,
        isError: false,
    }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { TransferOrderList } = require('../TransferOrderList');

const parada = { serviceId: 'svc-1', nome: 'Nota', endereco: 'Rua A', pedidos: [{ id: 'svc-1', serviceType: 'DELIVERY' }] };

function expandida(compartimentoDe?: (id: string) => string | null) {
    let r!: TestRenderer.ReactTestRenderer;
    act(() => {
        r = TestRenderer.create(
            <ThemeProvider theme={theme}>
                <TransferOrderList paradas={[parada]} compartimentoDe={compartimentoDe} />
            </ThemeProvider>,
        );
    });
    const toque = r.root.findAll((n) => typeof n.props.onPress === 'function')[0];
    act(() => {
        toque.props.onPress();
    });
    return r;
}

const temTexto = (r: TestRenderer.ReactTestRenderer, s: string) => r.root.findAll((n) => n.props.children === s).length > 0;

describe('TransferOrderList: compartimento da linha na parada agrupada', () => {
    it('mostra o texto do compartimento embaixo do material', () => {
        const r = expandida((id) => (id === 'l1' ? 'Compartimento 2' : null));
        expect(temTexto(r, 'Caixa A')).toBe(true);
        expect(temTexto(r, 'Compartimento 2')).toBe(true);
    });

    it('sem a prop, nada aparece (lote CD→CD)', () => {
        const r = expandida();
        expect(temTexto(r, 'Caixa A')).toBe(true);
        expect(temTexto(r, 'Compartimento 2')).toBe(false);
    });
});
