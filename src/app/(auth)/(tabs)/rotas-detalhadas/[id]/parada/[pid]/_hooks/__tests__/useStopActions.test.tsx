/**
 * F5 (correção do review): `moneyChangedKeys()` saiu de `routeStopChangedKeys` (que roda
 * a cada `routing_updated`/`service_updated` do `/monitoring`, inclusive na reprojeção de
 * ETA — sem nenhuma mudança de dinheiro) e passou a ser chamada só nos pontos de
 * conclusão/insucesso. `useStopActions` é um deles: `handleCompleteService` conclui a
 * parada — uma cobrança em dinheiro pendente pode ter virado dívida (carteira) e
 * pagamento (cobranças) no mesmo gesto. `handleStartService`/`handleStartAttendance` NÃO
 * concluem nada, então não devem disparar a invalidação de dinheiro.
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
let completeSuccess: (() => void) | undefined;

jest.mock('@/domain/agility/service/useCase', () => ({
    useStartService: (options?: { onSuccess?: () => void }) => {
        startSuccess = options?.onSuccess;
        return { startService: jest.fn(), isLoading: false };
    },
    useStartAttendance: (options?: { onSuccess?: () => void }) => {
        attendanceSuccess = options?.onSuccess;
        return { startAttendanceAsync: jest.fn(), isLoading: false };
    },
    useCompleteService: (options?: { onSuccess?: () => void }) => {
        completeSuccess = options?.onSuccess;
        return { completeService: jest.fn(), isLoading: false };
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
        completeSuccess = undefined;
        jest.clearAllMocks();
    });

    it('handleCompleteService (conclusão): invalida carteira e financeiro', async () => {
        const queryClient = new QueryClient();
        seedMoneyCache(queryClient);
        const tree = montar(queryClient);

        await act(async () => {
            await completeSuccess?.();
        });

        expect(isMoneyInvalidated(queryClient)).toBe(true);

        act(() => tree.unmount());
        queryClient.clear();
    });

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
