/**
 * Backlog das fases 3D e 4, item 7: o cabeçalho do modal do check mostra o S/N ao lado do SKU.
 */
import React from 'react';

import { ThemeProvider } from '@shopify/restyle';
import TestRenderer, { act } from 'react-test-renderer';

import type { ServiceLine } from '@/domain/agility/service/dto/response/service-line.response';
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
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@/components/Input/Input', () => ({ Input: () => null }));
jest.mock('@/hooks/useAppSafeArea', () => ({ useAppSafeArea: () => ({ top: 20, bottom: 20 }) }));

import { ItemCheckModal } from '../ItemCheckModal';

const linha = (over: Partial<ServiceLine>): ServiceLine =>
    ({ id: 'l', material: 'MODEM A', quantity: 1, status: 'PENDING', createdAt: '', updatedAt: '', ...over }) as ServiceLine;

function render(item: ServiceLine) {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
        tree = TestRenderer.create(
            <ThemeProvider theme={theme}>
                <ItemCheckModal visible item={item} onClose={jest.fn()} onConfirm={jest.fn()} />
            </ThemeProvider>,
        );
    });
    return tree;
}

const temTexto = (t: TestRenderer.ReactTestRenderer, s: string) => t.root.findAll((n) => n.props.children === s).length > 0;

it('o modal do check mostra o S/N ao lado do SKU', () => {
    const t = render(linha({ sku: 'MOD-1', serialNumber: 'SN-A' }));
    expect(temTexto(t, '• S/N: SN-A')).toBe(true);
});

it('o modal do check sem série não mostra "S/N"', () => {
    const t = render(linha({ sku: 'MOD-1', serialNumber: null }));
    const comSN = t.root.findAll(
        (n) => (typeof n.props.children === 'string' && n.props.children.includes('S/N')) ||
            (Array.isArray(n.props.children) && n.props.children.some((c: unknown) => typeof c === 'string' && c.includes('S/N'))),
    );
    expect(comSN.length).toBe(0);
});
