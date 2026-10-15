/**
 * Fase 3D: o botão "Trocar equipamento" da tela de confirmação do SERVICE só aparece com um
 * equipamento "Levei" (CHECKED) de quantidade 1, e abre o modal da troca.
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
jest.mock('@/components/Icon/Icon', () => ({ Icon: () => null }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() }, usePathname: () => '/x' }));
jest.mock('../../shared/Map', () => ({ Map: () => null }));
jest.mock('../../shared/ServiceLinesModal', () => ({ ServiceLinesModal: () => null }));
jest.mock('../TrocarEquipamentoModal', () => ({
    // O modal abre por `visible`: o teste só precisa ver que o botão o liga.
    TrocarEquipamentoModal: (props: { visible: boolean }) => (props.visible ? 'modal-aberto' : null),
}));

let mockService: unknown;
jest.mock('../../../_context/ParadaContext', () => ({
    useParada: () => ({
        service: mockService,
        effectiveAddress: null,
        setEtapa: jest.fn(),
        setDelivered: jest.fn(),
        isServiceStarted: true,
        rotaId: 'r1',
    }),
}));

import { ServiceEtapaConfirmacao } from '../ServiceEtapaConfirmacao';

const linha = (over: Partial<ServiceLine>): ServiceLine =>
    ({ id: 'l', material: 'Item', quantity: 1, status: 'CHECKED', createdAt: '', updatedAt: '', ...over }) as ServiceLine;

function render(service: unknown): TestRenderer.ReactTestRenderer {
    mockService = service;
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
        tree = TestRenderer.create(
            <ThemeProvider theme={theme}>
                <ServiceEtapaConfirmacao />
            </ThemeProvider>,
        );
    });
    return tree;
}

const botaoTrocar = (t: TestRenderer.ReactTestRenderer) =>
    t.root.findAll((n) => n.props.title === 'Trocar equipamento' && typeof n.props.onPress === 'function')[0];

const SERVICE = { id: 's1', serviceType: 'SERVICE' };

describe('ServiceEtapaConfirmacao — Trocar equipamento (fase 3D)', () => {
    it('com um equipamento "Levei" de quantidade 1: mostra o botão, e ele abre o modal', () => {
        const t = render({ ...SERVICE, materials: [linha({ id: 'a' })] });

        expect(botaoTrocar(t)).toBeDefined();
        expect(JSON.stringify(t.toJSON())).not.toContain('modal-aberto');

        act(() => {
            botaoTrocar(t).props.onPress();
        });
        expect(JSON.stringify(t.toJSON())).toContain('modal-aberto');
    });

    it('sem equipamento trocável (só pendente, quantidade 2 ou já trocado): sem o botão', () => {
        const t = render({
            ...SERVICE,
            materials: [
                linha({ id: 'p', status: 'PENDING' }),
                linha({ id: 'q', quantity: 2 }),
                linha({ id: 's', status: 'SWAPPED' }),
            ],
        });

        expect(botaoTrocar(t)).toBeUndefined();
    });

    it('sem linhas: sem o botão', () => {
        const t = render({ ...SERVICE, materials: [] });

        expect(botaoTrocar(t)).toBeUndefined();
    });

    // O backend recusa a troca da coleta (400 "Só troca equipamento marcado como Levei").
    it('só uma linha de coleta (PICKUP) "Levei" de quantidade 1: sem o botão', () => {
        const t = render({ ...SERVICE, materials: [linha({ id: 'c', direction: 'PICKUP' })] });

        expect(botaoTrocar(t)).toBeUndefined();
    });
});
