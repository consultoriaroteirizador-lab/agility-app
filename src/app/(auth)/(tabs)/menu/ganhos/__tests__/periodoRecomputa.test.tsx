/**
 * F5 (correção do review): `periodStart(period)` chama `new Date()` por dentro quando `now`
 * não é passado, mas o `useMemo` de `startDate` só tinha `period` nas deps — com o app
 * aberto atravessando a meia-noite (ou reaberto dias depois sem trocar o seletor
 * "Hoje/Semana/Mês/Ano"), o início do período ficava CONGELADO no dia em que foi calculado
 * pela primeira vez.
 *
 * A correção NÃO é só "adicionar uma chave ao array de deps do `useMemo`": o React Compiler
 * deste projeto (`babel.config.js`) reconstrói as deps de cada `useMemo` pela análise
 * ESTÁTICA de quem o corpo da função de fato LÊ — uma dependência só listada no array, sem
 * uso dentro do corpo, é DESCARTADA do cache do compilador (confirmado inspecionando a saída
 * compilada com `npx babel ... --plugins=react-compiler`). Por isso `now` (não um
 * `todayKey` solto) é `useState`, recalculado no FOCO da tela (`useFocusEffect` — reabrir
 * "Ganhos"/"Cobranças" depois da meia-noite é exatamente o caso a cobrir) e passado como
 * ARGUMENTO explícito de `periodStart(period, now)`, lido de verdade dentro do `useMemo`.
 *
 * Estes testes provam o mecanismo: montam a tela, selecionam "Hoje", disparam o callback de
 * foco novamente simulando o motorista reabrindo a aba no dia seguinte (sem tocar em
 * "period") — o `startDate` passado ao hook de dados tem que mudar.
 *
 * `new Date()` é substituído por uma classe controlável (não `jest.useFakeTimers`): fakear
 * timers junto travava o scheduler do React por baixo (`setTimeout`/`MessageChannel`) e
 * deixava os testes instáveis.
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

// `useFocusEffect` real depende de um navegador de verdade (sem isso aqui) — o mock chama o
// callback no mount (foco inicial, como a aba abrindo pela 1ª vez) e devolve a MESMA função
// via `mockFocusCallback` para o teste disparar de novo, simulando reabrir a tela.
let mockFocusCallback: (() => void) | undefined;
jest.mock('expo-router', () => ({
    useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
    router: { push: jest.fn(), back: jest.fn() },
    useFocusEffect: (callback: () => void) => {
        mockFocusCallback = callback;
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('react').useEffect(() => {
            callback();
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);
    },
}));
jest.mock('@/EarningsChart', () => ({ __esModule: true, default: () => null }));

const mockUseFreightEarnings = jest.fn();
const mockUseInfinitePayments = jest.fn();
jest.mock('@/domain/agility/wallet', () => ({
    useGetWallet: () => ({ wallet: undefined }),
    useFreightEarnings: (startDate: string) => mockUseFreightEarnings(startDate),
    useGetAdvancesSummary: () => ({ summary: undefined, isError: false, refetch: jest.fn() }),
    useDriverFreightShares: () => ({ page: null, isLoading: false, isError: false, refetch: jest.fn() }),
}));
jest.mock('@/domain/agility/finance', () => ({
    useInfinitePayments: (range: unknown) => mockUseInfinitePayments(range),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const CobrancasScreen = require('../cobrancas').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const GanhosScreen = require('../index').default;

const EARNINGS_RESULT = { earnings: undefined, isLoading: false, isError: false, refetch: jest.fn(), isRefetching: false };
const PAYMENTS_RESULT = {
    items: [],
    isLoading: false,
    isError: false,
    isFetchNextPageError: false,
    isFetchingNextPage: false,
    loadMore: jest.fn(),
    refetch: jest.fn(),
    isRefreshing: false,
};

function pressPeriodo(tree: TestRenderer.ReactTestRenderer, label: string) {
    const texto = tree.root.findAll((n) => n.props.children === label)[0];
    let alvo = texto.parent;
    while (alvo && typeof alvo.props.onPress !== 'function') {
        alvo = alvo.parent;
    }
    if (!alvo) throw new Error(`Nenhum onPress encontrado acima do rótulo "${label}"`);
    act(() => {
        alvo!.props.onPress();
    });
}

const RealDate = global.Date;

/** Trava `new Date()`/`Date.now()` num instante fixo, sem tocar em setTimeout/scheduler. */
function travarRelogio(iso: string) {
    class DataTravada extends RealDate {
        constructor(...args: unknown[]) {
            if (args.length === 0) {
                super(iso);
            } else {
                // @ts-expect-error -- repassa os args originais do construtor de Date
                super(...args);
            }
        }
        static now() {
            return new RealDate(iso).getTime();
        }
    }
    // @ts-expect-error -- substituição deliberada do global, restaurada no afterEach
    global.Date = DataTravada;
}

beforeEach(() => {
    mockFocusCallback = undefined;
    mockUseFreightEarnings.mockReset().mockReturnValue(EARNINGS_RESULT);
    mockUseInfinitePayments.mockReset().mockReturnValue(PAYMENTS_RESULT);
});

afterEach(() => {
    global.Date = RealDate;
});

describe('Ganhos — período "Hoje" recomputa quando o dia-calendário muda', () => {
    it('reabrir a tela (foco) no dia seguinte, sem tocar no seletor, muda o startDate mandado ao hook', () => {
        travarRelogio('2026-09-30T20:00:00-03:00');

        let tree!: TestRenderer.ReactTestRenderer;
        act(() => {
            tree = TestRenderer.create(
                <ThemeProvider theme={theme}>
                    <GanhosScreen />
                </ThemeProvider>,
            );
        });
        pressPeriodo(tree, 'Hoje');

        const primeiraChamada = mockUseFreightEarnings.mock.calls.at(-1)?.[0];
        expect(primeiraChamada).toBe('2026-09-30T03:00:00.000Z'); // meia-noite SP = 03:00 UTC

        // Vira o dia e simula reabrir a tela (foco), sem tocar em "period".
        travarRelogio('2026-10-01T00:30:00-03:00');
        act(() => {
            mockFocusCallback?.();
        });

        const segundaChamada = mockUseFreightEarnings.mock.calls.at(-1)?.[0];
        expect(segundaChamada).toBe('2026-10-01T03:00:00.000Z');
        expect(segundaChamada).not.toBe(primeiraChamada);

        act(() => tree.unmount());
    });
});

describe('Cobranças — período "Hoje" recomputa quando o dia-calendário muda', () => {
    it('reabrir a tela (foco) no dia seguinte, sem tocar no seletor, muda o startDate mandado ao hook', () => {
        travarRelogio('2026-09-30T20:00:00-03:00');

        let tree!: TestRenderer.ReactTestRenderer;
        act(() => {
            tree = TestRenderer.create(
                <ThemeProvider theme={theme}>
                    <CobrancasScreen />
                </ThemeProvider>,
            );
        });
        pressPeriodo(tree, 'Hoje');

        const primeiraChamada = mockUseInfinitePayments.mock.calls.at(-1)?.[0];
        expect(primeiraChamada).toEqual({ startDate: '2026-09-30' });

        travarRelogio('2026-10-01T00:30:00-03:00');
        act(() => {
            mockFocusCallback?.();
        });

        const segundaChamada = mockUseInfinitePayments.mock.calls.at(-1)?.[0];
        expect(segundaChamada).toEqual({ startDate: '2026-10-01' });

        act(() => tree.unmount());
    });
});
