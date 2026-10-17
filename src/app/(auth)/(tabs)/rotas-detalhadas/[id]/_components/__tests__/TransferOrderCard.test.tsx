/**
 * O card expande e busca as linhas da PRÓPRIA nota: pedido em /items, SERVICE em /materials
 * (o backend recusa a família errada com 400). A escolha mora no 2º argumento de useGetServiceLines.
 */
import React from 'react';

import { ThemeProvider } from '@shopify/restyle';
import TestRenderer, { act } from 'react-test-renderer';

import { ServiceType } from '@/domain/agility/service/dto/types';
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

const mockUseGetServiceLines = jest.fn();
jest.mock('@/domain/agility/service/useCase/useGetServiceLines', () => ({
    useGetServiceLines: (...args: unknown[]) => mockUseGetServiceLines(...args),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { TransferOrderCard } = require('../TransferOrderCard');

function expandir(serviceType: ServiceType | undefined) {
    mockUseGetServiceLines.mockReset();
    mockUseGetServiceLines.mockReturnValue({ lines: [], isLoading: false, isError: false });
    const parada = { serviceId: 'svc-1', nome: 'Nota', endereco: 'Rua A', pedidos: [{ id: 'svc-1', serviceType }] };
    let r!: TestRenderer.ReactTestRenderer;
    act(() => {
        r = TestRenderer.create(
            <ThemeProvider theme={theme}>
                <TransferOrderCard parada={parada} />
            </ThemeProvider>,
        );
    });
    const toque = r.root.findAll((n) => typeof n.props.onPress === 'function')[0];
    act(() => {
        toque.props.onPress();
    });
    return mockUseGetServiceLines.mock.calls[mockUseGetServiceLines.mock.calls.length - 1];
}

describe('TransferOrderCard: a família das linhas vem do tipo da própria nota', () => {
    it('nota de SERVICE expandida busca pela família materials', () => {
        const [id, tipo] = expandir(ServiceType.SERVICE);
        expect(id).toBe('svc-1');
        expect(tipo).toBe(ServiceType.SERVICE);
    });

    it.each([ServiceType.DELIVERY, ServiceType.TRANSFER])('nota de %s expandida busca pela família items', (tipo) => {
        const [id, enviado] = expandir(tipo);
        expect(id).toBe('svc-1');
        expect(enviado).toBe(tipo);
    });
});
