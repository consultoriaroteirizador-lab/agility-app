import React from 'react';

import { ThemeProvider } from '@shopify/restyle';
import TestRenderer, { act } from 'react-test-renderer';

import type { ServiceLine } from '@/domain/agility/service/dto/response/service-line.response';
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
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

import { ServiceLinesList } from '../ServiceLinesList';

const linha = (over: Partial<ServiceLine>): ServiceLine =>
    ({ id: 'l', material: 'Item', quantity: 1, status: 'CHECKED', createdAt: '', updatedAt: '', ...over }) as ServiceLine;

function render(lines: ServiceLine[]) {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
        tree = TestRenderer.create(
            <ThemeProvider theme={theme}>
                <ServiceLinesList lines={lines} serviceType={ServiceType.SERVICE} />
            </ThemeProvider>,
        );
    });
    return tree;
}

const textos = (t: TestRenderer.ReactTestRenderer) =>
    t.root.findAll((n) => typeof n.props.children === 'string').map((n) => n.props.children as string);

describe('ServiceLinesList — troca de equipamento (fase 3D)', () => {
    it('A trocada mostra o selo "Trocado"; B mostra "No lugar de: A (S/N …)"', () => {
        const A = linha({ id: 'a', material: 'MODEM A', serialNumber: 'SN-A', status: 'SWAPPED' });
        const B = linha({ id: 'b', material: 'MODEM B', serialNumber: 'SN-B', replacesMaterialId: 'a' });

        const t = render([A, B]);

        expect(textos(t)).toContain('Trocado');
        expect(textos(t)).toContain('No lugar de: MODEM A (S/N SN-A)');
    });

    it('sem troca: nem selo nem "No lugar de" (controle)', () => {
        const t = render([linha({ id: 'a', material: 'MODEM A', serialNumber: 'SN-A' })]);

        expect(textos(t)).not.toContain('Trocado');
        expect(textos(t).some((s) => s.startsWith('No lugar de'))).toBe(false);
    });
});
