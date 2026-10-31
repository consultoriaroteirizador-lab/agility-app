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

const mockUseRota = jest.fn();
jest.mock('../../_context/RotaContext', () => ({
    useRota: () => mockUseRota(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ComposicaoDaRota } = require('../ComposicaoDaRota');

function render() {
    let r!: TestRenderer.ReactTestRenderer;
    act(() => {
        r = TestRenderer.create(
            <ThemeProvider theme={theme}>
                <ComposicaoDaRota />
            </ThemeProvider>,
        );
    });
    return JSON.stringify(r.toJSON());
}

describe('ComposicaoDaRota', () => {
    it('mostra o texto da composição', () => {
        mockUseRota.mockReturnValue({
            routing: { vehicle: { plate: 'ABC1D23', kind: 'TRACTOR' }, trailers: [{ plate: 'XYZ9K87', position: 1 }] },
        });
        expect(render()).toContain('Cavalo ABC1D23 · carreta XYZ9K87');
    });

    it('não renderiza sem veículo', () => {
        mockUseRota.mockReturnValue({ routing: { vehicle: null, trailers: [] } });
        expect(render()).toBe('null');
    });

    it('não renderiza com backend antigo (campos ausentes) nem sem routing', () => {
        mockUseRota.mockReturnValue({ routing: {} });
        expect(render()).toBe('null');
        mockUseRota.mockReturnValue({ routing: undefined });
        expect(render()).toBe('null');
    });
});
