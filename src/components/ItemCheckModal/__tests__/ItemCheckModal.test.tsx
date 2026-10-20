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
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null, MaterialIcons: () => null }));
jest.mock('@/components/Input/Input', () => ({ Input: () => null }));
jest.mock('@/hooks/useAppSafeArea', () => ({ useAppSafeArea: () => ({ top: 20, bottom: 20 }) }));

import { ItemCheckModal } from '../ItemCheckModal';

const linha = (over: Partial<ServiceLine>): ServiceLine =>
    ({ id: 'l', material: 'MODEM A', quantity: 1, status: 'PENDING', createdAt: '', updatedAt: '', ...over }) as ServiceLine;

function render(item: ServiceLine, context?: 'delivery' | 'pickup' | 'equipment') {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
        tree = TestRenderer.create(
            <ThemeProvider theme={theme}>
                <ItemCheckModal visible item={item} onClose={jest.fn()} onConfirm={jest.fn()} context={context} />
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

it('a linha Quantidade/SKU/S/N do modal quebra em vez de sair da tela (360 dp)', () => {
    const t = render(linha({ sku: 'ONT-F670L', serialNumber: 'ZTEGC8A1B2C3' }));
    let no: TestRenderer.ReactTestInstance | null = t.root.findAll((n) => n.props.children === '• S/N: ZTEGC8A1B2C3')[0];
    while (no && no.props.flexDirection !== 'row') no = no.parent;
    expect(no).not.toBeNull();
    expect(no?.props.flexWrap).toBe('wrap');
});

it('o modal do check sem série não mostra "S/N"', () => {
    const t = render(linha({ sku: 'MOD-1', serialNumber: null }));
    const comSN = t.root.findAll(
        (n) => (typeof n.props.children === 'string' && n.props.children.includes('S/N')) ||
            (Array.isArray(n.props.children) && n.props.children.some((c: unknown) => typeof c === 'string' && c.includes('S/N'))),
    );
    expect(comSN.length).toBe(0);
});

function escolher(t: TestRenderer.ReactTestRenderer, rotulo: string) {
    let no: TestRenderer.ReactTestInstance | null = t.root.findAll((n) => n.props.children === rotulo)[0];
    while (no && typeof no.props.onPress !== 'function') no = no.parent;
    act(() => no?.props.onPress());
}

const botaoConfirmar = (t: TestRenderer.ReactTestRenderer) => t.root.findAll((n) => n.props.title === 'Confirmar' && 'disabled' in n.props)[0];

it('em DAMAGED sem foto o Confirmar fica desabilitado', () => {
    const t = render(linha({}));
    expect(botaoConfirmar(t).props.disabled).toBeFalsy();
    escolher(t, 'Danificado');
    expect(botaoConfirmar(t).props.disabled).toBe(true);
});

it('no contexto de equipamento a opção Recusado não aparece', () => {
    expect(temTexto(render(linha({}), 'equipment'), 'Recusado')).toBe(false);
    expect(temTexto(render(linha({}), 'delivery'), 'Recusado')).toBe(true);
});
