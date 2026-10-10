/**
 * Meus abastecimentos: data em São Paulo, litros e valor em pt-BR, a marca de odômetro e o anulado pela
 * central; erro na primeira página nunca vira "nenhum abastecimento".
 */
import React from 'react';

import { ThemeProvider } from '@shopify/restyle';
import TestRenderer, { act } from 'react-test-renderer';

import { theme } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';

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

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter, router: mockRouter }));

const mockList = jest.fn();
jest.mock('@/domain/agility/fuelEntry', () => ({
    ...jest.requireActual('@/domain/agility/fuelEntry/fuelEntryDisplay'),
    useInfiniteMyFuelEntries: () => mockList(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const HistoricoScreen = require('../historico').default;

const base = {
    isLoading: false,
    isError: false,
    isFetchNextPageError: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    loadMore: jest.fn(),
    refetch: jest.fn(),
    isRefreshing: false,
};
const linha = {
    id: 'e1',
    vehiclePlate: 'ABC1D23',
    filledAt: '2026-10-08T17:30:00.000Z',
    fuelType: 'DIESEL',
    liters: 45.5,
    totalValue: 250,
    odometerKm: 48210,
    previousOdometerKm: 50000,
    odometerInconsistent: true,
    paidBy: 'COMPANY',
    status: 'ACTIVE',
    voidReason: null,
};

function textos() {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
        tree = TestRenderer.create(
            <ThemeProvider theme={theme}>
                <HistoricoScreen />
            </ThemeProvider>,
        );
    });
    return tree.root.findAll((n) => typeof n.props.children === 'string').map((n) => n.props.children as string);
}

it('linha com data em São Paulo, litros, valor e a marca de inconsistência', () => {
    mockList.mockReturnValue({ ...base, items: [linha] });
    const t = textos();
    expect(t).toContain('08/10/2026 14:30');
    expect(t).toContain('Diesel · 45,5 L');
    expect(formatCurrency(250, true)).toMatch(/^R\$\s250,00$/);
    expect(t).toContain(formatCurrency(250, true));
    expect(t).toContain('Odômetro abaixo do anterior (50.000 km): a central vai revisar.');
});

it('anulado pela central aparece como anulado, com o motivo', () => {
    mockList.mockReturnValue({ ...base, items: [{ ...linha, odometerInconsistent: false, status: 'VOIDED', voidReason: 'Nota duplicada' }] });
    expect(textos()).toContain('Anulado pela central: Nota duplicada');
});

it('vazio: diz que não há abastecimento', () => {
    mockList.mockReturnValue({ ...base, items: [] });
    expect(textos()).toContain('Nenhum abastecimento registrado ainda.');
});

it('erro na primeira página: pede para tentar de novo, nunca mostra a lista vazia', () => {
    mockList.mockReturnValue({ ...base, items: [], isError: true });
    const t = textos();
    expect(t).toContain('Não foi possível carregar seus abastecimentos.');
    expect(t).not.toContain('Nenhum abastecimento registrado ainda.');
});
