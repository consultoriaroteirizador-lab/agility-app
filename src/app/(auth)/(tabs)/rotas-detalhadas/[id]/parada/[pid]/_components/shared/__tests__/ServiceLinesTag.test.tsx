import React from 'react';

import { ThemeProvider } from '@shopify/restyle';
import TestRenderer, { act } from 'react-test-renderer';

import type { ServiceResponse } from '@/domain/agility/service/dto';
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

const mockUseFindOneRouting = jest.fn();
jest.mock('@/domain/agility/routing/useCase', () => ({
    useFindOneRouting: (...args: unknown[]) => mockUseFindOneRouting(...args),
}));

import { ServiceLinesTag } from '../ServiceLinesTag';

const service = (over: Partial<ServiceResponse> = {}): ServiceResponse =>
    ({
        id: 's1',
        routingId: 'r1',
        serviceType: ServiceType.DELIVERY,
        items: [{ id: 'l1', material: 'Gas A', quantity: 1, status: 'CHECKED', createdAt: '', updatedAt: '' }],
        ...over,
    }) as unknown as ServiceResponse;

const comPlano = {
    routing: {
        loadPlan: [{ orderItemId: 'l1', trailerPlate: null, compartment: 2 }],
        vehicle: { compartments: 3 },
        trailers: [],
    },
};

function abrir(svc: ServiceResponse | null) {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
        tree = TestRenderer.create(
            <ThemeProvider theme={theme}>
                <ServiceLinesTag service={svc} />
            </ThemeProvider>,
        );
    });
    const chip = tree.root.findAll((n) => typeof n.props.onPress === 'function' && n.props.onPress.length === 0)[0];
    if (chip) act(() => chip.props.onPress());
    return tree;
}

const textos = (t: TestRenderer.ReactTestRenderer) =>
    t.root.findAll((n) => typeof n.props.children === 'string').map((n) => n.props.children as string);

describe('ServiceLinesTag — compartimento da linha', () => {
    beforeEach(() => mockUseFindOneRouting.mockReset());

    it('abrir o chip mostra o compartimento da linha', () => {
        mockUseFindOneRouting.mockReturnValue(comPlano);

        const t = abrir(service());

        expect(textos(t)).toContain('Compartimento 2');
        expect(mockUseFindOneRouting).toHaveBeenCalledWith('r1');
    });

    it('sem plano (rota antiga) o modal abre sem linha de compartimento', () => {
        mockUseFindOneRouting.mockReturnValue({ routing: { vehicle: { compartments: 3 }, trailers: [] } });

        const t = abrir(service());

        expect(textos(t)).toContain('Gas A');
        expect(textos(t).some((s) => /ompartimento/.test(s))).toBe(false);
    });

    it('routingId nulo não quebra', () => {
        mockUseFindOneRouting.mockReturnValue({ routing: null });

        const t = abrir(service({ routingId: null }));

        expect(textos(t)).toContain('Gas A');
        expect(mockUseFindOneRouting).toHaveBeenCalledWith('');
    });

    it('serviço sem linhas não renderiza nada, mas o hook roda antes do return', () => {
        mockUseFindOneRouting.mockReturnValue({ routing: null });

        const t = abrir(service({ items: [] } as Partial<ServiceResponse>));

        expect(t.toJSON()).toBeNull();
    });
});
