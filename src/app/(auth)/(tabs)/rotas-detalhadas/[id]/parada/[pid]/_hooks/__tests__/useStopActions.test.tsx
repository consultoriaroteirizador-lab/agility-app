/**
 * `useStopActions` só inicia parada e atendimento: nenhum dos dois conclui nada, então não
 * invalidam o dinheiro. A conclusão mora em `useServiceCompletion` (completion-details), o
 * único caminho que leva o valor recebido (F5b, R8).
 */
import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TestRenderer, { act } from 'react-test-renderer';

import { KEY_FINANCE, KEY_WALLET } from '@/domain/queryKeys';

import { useStopActions } from '../useStopActions';

const mockRouter = { push: jest.fn(), back: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));

const mockShowToast = jest.fn();
jest.mock('@/services/Toast/useToast', () => ({ useToastService: () => ({ showToast: mockShowToast }) }));

jest.mock('../getCurrentCoords', () => ({ getCurrentCoords: jest.fn().mockResolvedValue(undefined) }));

let startSuccess: (() => void) | undefined;
let attendanceSuccess: (() => void) | undefined;

jest.mock('@/domain/agility/service/useCase', () => ({
    useStartService: (options?: { onSuccess?: () => void }) => {
        startSuccess = options?.onSuccess;
        return { startService: jest.fn(), isLoading: false };
    },
    useStartAttendance: (options?: { onSuccess?: () => void }) => {
        attendanceSuccess = options?.onSuccess;
        return { startAttendanceAsync: jest.fn(), isLoading: false };
    },
}));

function montar(queryClient: QueryClient) {
    let tree!: TestRenderer.ReactTestRenderer;
    function Probe() {
        useStopActions({ serviceId: 'service-1', routeId: 'rota-1' });
        return null;
    }
    act(() => {
        tree = TestRenderer.create(
            <QueryClientProvider client={queryClient}>
                <Probe />
            </QueryClientProvider>,
        );
    });
    return tree;
}

function seedMoneyCache(queryClient: QueryClient) {
    queryClient.setQueryData([KEY_WALLET, 'balance'], {});
    queryClient.setQueryData([KEY_FINANCE, 'payments', 'infinite', { startDate: '2026-09-01' }], {});
}

const isMoneyInvalidated = (queryClient: QueryClient) =>
    queryClient.getQueryState([KEY_WALLET, 'balance'])?.isInvalidated === true &&
    queryClient.getQueryState([KEY_FINANCE, 'payments', 'infinite', { startDate: '2026-09-01' }])?.isInvalidated === true;

describe('useStopActions — invalidação de dinheiro (Task F5)', () => {
    afterEach(() => {
        startSuccess = undefined;
        attendanceSuccess = undefined;
        jest.clearAllMocks();
    });

    // O controle positivo da conclusão (invalida carteira e financeiro) vive em
    // `useServiceCompletion.test.tsx`; aqui só se prova que iniciar não invalida.
    it('start service concluído (NÃO é conclusão de parada): não invalida dinheiro', async () => {
        const queryClient = new QueryClient();
        seedMoneyCache(queryClient);
        const tree = montar(queryClient);

        await act(async () => {
            await startSuccess?.();
        });

        expect(isMoneyInvalidated(queryClient)).toBe(false);

        act(() => tree.unmount());
        queryClient.clear();
    });

    it('start attendance concluído (NÃO é conclusão de parada): não invalida dinheiro', async () => {
        const queryClient = new QueryClient();
        seedMoneyCache(queryClient);
        const tree = montar(queryClient);

        await act(async () => {
            await attendanceSuccess?.();
        });

        expect(isMoneyInvalidated(queryClient)).toBe(false);

        act(() => tree.unmount());
        queryClient.clear();
    });
});
