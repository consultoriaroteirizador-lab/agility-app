/**
 * Fase 3D: a linha trocada (SWAPPED) tem rótulo no card do check. O `Record` exaustivo do
 * `statusConfig` obriga o rótulo no `tsc`; este teste pina o texto.
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

import { ItemCheckCard } from '../ItemCheckCard';

const linha = (over: Partial<ServiceLine>): ServiceLine =>
    ({ id: 'l', material: 'MODEM A', quantity: 1, status: 'CHECKED', createdAt: '', updatedAt: '', ...over }) as ServiceLine;

function render(item: ServiceLine) {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
        tree = TestRenderer.create(
            <ThemeProvider theme={theme}>
                <ItemCheckCard item={item} onCheck={jest.fn()} />
            </ThemeProvider>,
        );
    });
    return tree;
}

const temTexto = (t: TestRenderer.ReactTestRenderer, s: string) => t.root.findAll((n) => n.props.children === s).length > 0;

it('linha trocada: selo "Trocado" e sem o botão Check', () => {
    const t = render(linha({ status: 'SWAPPED' }));
    expect(temTexto(t, 'Trocado')).toBe(true);
    expect(temTexto(t, 'Check')).toBe(false);
});

it('linha pendente: "Pendente" e o botão Check (controle)', () => {
    const t = render(linha({ status: 'PENDING' }));
    expect(temTexto(t, 'Pendente')).toBe(true);
    expect(temTexto(t, 'Check')).toBe(true);
});

it('mostra "S/N: X" quando a linha tem serialNumber (backlog: a série certa no check)', () => {
    const t = render(linha({ status: 'PENDING', serialNumber: 'SN-A' }));
    expect(temTexto(t, 'S/N: SN-A')).toBe(true);
});

it('sem série, não mostra "S/N"', () => {
    const t = render(linha({ status: 'PENDING', serialNumber: null }));
    expect(t.root.findAll((n) => typeof n.props.children === 'string' && n.props.children.startsWith('S/N')).length).toBe(0);
});
