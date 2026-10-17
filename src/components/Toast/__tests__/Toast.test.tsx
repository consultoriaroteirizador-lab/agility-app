/**
 * Backlog item 8: o timer do toast anterior não pode apagar o seguinte antes da hora, e a saída
 * interrompida por um toast novo (`finished: false`) não apaga o novo. A animação é controlada por spy.
 */
import React from 'react';
import { Animated } from 'react-native';

import { ThemeProvider } from '@shopify/restyle';
import TestRenderer, { act } from 'react-test-renderer';

import { useToastService } from '@/services/Toast/useToast';
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
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

import { Toast } from '../Toast';

let mostrar!: ReturnType<typeof useToastService>['showToast'];
let esconder!: ReturnType<typeof useToastService>['hideToast'];

function Disparador() {
    const { showToast, hideToast } = useToastService();
    mostrar = showToast;
    esconder = hideToast;
    return null;
}

let arvores: TestRenderer.ReactTestRenderer[] = [];

function montar() {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
        tree = TestRenderer.create(
            <ThemeProvider theme={theme}>
                <Toast />
                <Disparador />
            </ThemeProvider>,
        );
    });
    arvores.push(tree);
    return tree;
}

const naTela = (t: TestRenderer.ReactTestRenderer, msg: string) => t.root.findAll((n) => n.props.children === msg).length > 0;

let fins: Array<Animated.EndCallback | undefined> = [];
const passar = (ms: number) =>
    act(() => {
        jest.advanceTimersByTime(ms);
    });
const terminarAnimacoes = (finished: boolean) =>
    act(() => {
        const pendentes = fins;
        fins = [];
        pendentes.forEach((cb) => cb?.({ finished }));
    });

beforeEach(() => {
    jest.useFakeTimers();
    fins = [];
    jest.spyOn(Animated, 'timing').mockImplementation(
        () =>
            ({
                start: (cb?: Animated.EndCallback) => {
                    fins.push(cb);
                },
                stop: jest.fn(),
                reset: jest.fn(),
            }) as unknown as Animated.CompositeAnimation,
    );
});

afterEach(() => {
    act(() => esconder());
    act(() => arvores.forEach((a) => a.unmount()));
    arvores = [];
    jest.useRealTimers();
    jest.restoreAllMocks();
});

it('um toast novo antes do fim do anterior fica os 4 s dele', () => {
    const t = montar();
    act(() => mostrar({ message: 'A' }));
    passar(3000);
    act(() => mostrar({ message: 'B' }));
    passar(2500); // 5,5 s: o timer de A (4 s) já teria começado a saída
    terminarAnimacoes(true); // a saída que estivesse pendente termina
    expect(naTela(t, 'B')).toBe(true);
});

it('toast novo durante a saída do anterior não some na hora', () => {
    const t = montar();
    act(() => mostrar({ message: 'A' }));
    passar(4000); // a saída de A começa
    act(() => mostrar({ message: 'B' }));
    terminarAnimacoes(false); // a entrada de B interrompe a saída de A: finished false
    expect(naTela(t, 'B')).toBe(true);
});

it('o toast sozinho some depois dos 4 s e da saída (controle)', () => {
    const t = montar();
    act(() => mostrar({ message: 'A' }));
    passar(4000);
    terminarAnimacoes(true);
    expect(naTela(t, 'A')).toBe(false);
});
