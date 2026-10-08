/**
 * Puxar para atualizar em Ganhos recarrega os ganhos do período E os fretes a liberar por rota.
 * Antes, só os ganhos voltavam: a seção nova ficava com o dado da primeira abertura.
 */
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
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-router', () => ({
    useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
    router: { push: jest.fn(), back: jest.fn() },
    useFocusEffect: jest.fn(),
}));
jest.mock('@/EarningsChart', () => ({ __esModule: true, default: () => null }));

const mockRefetchEarnings = jest.fn();
const mockRefetchFreightShares = jest.fn();
const mockUseDriverFreightShares = jest.fn();
jest.mock('@/domain/agility/wallet', () => ({
    useGetWallet: () => ({ wallet: undefined }),
    useFreightEarnings: () => ({
        earnings: undefined, isLoading: false, isError: false, refetch: mockRefetchEarnings, isRefetching: false,
    }),
    useDriverFreightShares: (...args: unknown[]) => mockUseDriverFreightShares(...args),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const GanhosScreen = require('../index').default;

beforeEach(() => {
    jest.clearAllMocks();
    mockUseDriverFreightShares.mockReturnValue({
        page: null, isLoading: true, isError: false, refetch: mockRefetchFreightShares,
    });
});

function render() {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
        tree = TestRenderer.create(
            <ThemeProvider theme={theme}>
                <GanhosScreen />
            </ThemeProvider>,
        );
    });
    return tree;
}

describe('Ganhos — puxar para atualizar', () => {
    it('recarrega os ganhos e os fretes a liberar por rota', () => {
        const tree = render();

        const rolagem = tree.root.findAll((n) => !!n.props.refreshControl)[0];
        act(() => rolagem.props.refreshControl.props.onRefresh());

        expect(mockRefetchEarnings).toHaveBeenCalledTimes(1);
        expect(mockRefetchFreightShares).toHaveBeenCalledTimes(1);
    });

    it('a seção pede só as parcelas A_LIBERAR', () => {
        render();

        expect(mockUseDriverFreightShares).toHaveBeenCalledWith({ status: 'A_LIBERAR' });
    });
});
