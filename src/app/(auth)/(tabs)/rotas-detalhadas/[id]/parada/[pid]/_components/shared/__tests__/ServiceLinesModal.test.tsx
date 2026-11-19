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
jest.mock('@/components/Modal/Modal', () => ({
    __esModule: true,
    default: ({ isVisible, children }: { isVisible: boolean; children: unknown }) => (isVisible ? children : null),
}));

import { ServiceLinesModal } from '../ServiceLinesModal';

it('ServiceLinesModal repassa compartimentoDe ao ServiceLinesList', () => {
    const lines = [{ id: 'l1', material: 'Gas A', quantity: 1, status: 'CHECKED', createdAt: '', updatedAt: '' }] as ServiceLine[];
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
        tree = TestRenderer.create(
            <ThemeProvider theme={theme}>
                <ServiceLinesModal
                    isVisible
                    onClose={() => undefined}
                    lines={lines}
                    serviceType={ServiceType.DELIVERY}
                    compartimentoDe={(id) => (id === 'l1' ? 'Compartimento 3' : null)}
                />
            </ThemeProvider>,
        );
    });

    const textos = tree.root.findAll((n) => typeof n.props.children === 'string').map((n) => n.props.children as string);
    expect(textos).toContain('Compartimento 3');
});
