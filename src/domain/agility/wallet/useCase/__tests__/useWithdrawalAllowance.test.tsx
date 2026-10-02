/**
 * O resumo mora sob `[KEY_WALLET]`: o saque (`onSettled`), a conclusão (`moneyChangedKeys`)
 * e o push (`PUSH_INVALIDATED_KEYS`) já o invalidam, sem lista nova para manter.
 */
import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TestRenderer, { act } from 'react-test-renderer';

import { KEY_WALLET, moneyChangedKeys } from '@/domain/queryKeys';

import { useWithdrawalAllowance } from '../useWithdrawalAllowance';

const mockGetSummary = jest.fn();
jest.mock('../../walletAPI', () => ({
    walletAPI: { getSummary: (...args: unknown[]) => mockGetSummary(...args) },
}));
jest.mock('@/services', () => ({
    useAuthCredentialsService: () => ({ authCredentials: { accessToken: 't', tenantId: 'c-1' } }),
}));

let resultado!: ReturnType<typeof useWithdrawalAllowance>;
function Probe() {
    resultado = useWithdrawalAllowance();
    return null;
}

async function settle() {
    for (let i = 0; i < 10; i++) {
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });
    }
}

function montar(queryClient: QueryClient) {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
        tree = TestRenderer.create(
            <QueryClientProvider client={queryClient}>
                <Probe />
            </QueryClientProvider>,
        );
    });
    return tree;
}

const novoClient = () => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });

beforeEach(() => mockGetSummary.mockReset());

it('normaliza o resumo e refaz a busca quando [KEY_WALLET] é invalidada', async () => {
    mockGetSummary.mockResolvedValue({ availableBalance: 10000, pendingAdvances: 3000, withdrawalWithDebtPolicy: 'EXCESS_ONLY', withdrawableBalance: 7000 });
    const queryClient = novoClient();
    const tree = montar(queryClient);
    await settle();

    expect(resultado.allowance).toEqual({ policy: 'EXCESS_ONLY', withdrawableCents: 7000, openDebtCents: 3000, availableCents: 10000 });
    expect(mockGetSummary).toHaveBeenCalledTimes(1);

    await act(async () => {
        await queryClient.invalidateQueries({ queryKey: [KEY_WALLET] });
    });
    await settle();
    expect(mockGetSummary).toHaveBeenCalledTimes(2);

    act(() => tree.unmount());
    queryClient.clear();
});

it('moneyChangedKeys() alcança a query do hook montado (prefixo posicional)', async () => {
    mockGetSummary.mockResolvedValue({ availableBalance: 10000, pendingAdvances: 0, withdrawalWithDebtPolicy: 'FREE', withdrawableBalance: 10000 });
    const queryClient = novoClient();
    const tree = montar(queryClient);
    await settle();
    expect(mockGetSummary).toHaveBeenCalledTimes(1);

    await act(async () => {
        for (const queryKey of moneyChangedKeys()) {
            await queryClient.invalidateQueries({ queryKey });
        }
    });
    await settle();
    expect(mockGetSummary.mock.calls.length).toBe(2);

    act(() => tree.unmount());
    queryClient.clear();
});

it('erro do resumo: allowance null (a tela cai no disponível) e isError', async () => {
    mockGetSummary.mockRejectedValue({ success: false, error: { message: 'falhou' } });
    const queryClient = novoClient();
    const tree = montar(queryClient);
    await settle();

    expect(resultado.allowance).toBeNull();
    expect(resultado.isError).toBe(true);

    act(() => tree.unmount());
    queryClient.clear();
});

it('carregando: allowance null, sem política inventada', async () => {
    mockGetSummary.mockReturnValue(new Promise(() => {}));
    const queryClient = novoClient();
    const tree = montar(queryClient);
    await settle();

    expect(resultado.isLoading).toBe(true);
    expect(resultado.allowance).toBeNull();

    act(() => tree.unmount());
    queryClient.clear();
});

it('resumo sem os campos da F3: allowance null, sem erro', async () => {
    mockGetSummary.mockResolvedValue({ availableBalance: 10000, pendingAdvances: 0 });
    const queryClient = novoClient();
    const tree = montar(queryClient);
    await settle();

    expect(resultado.allowance).toBeNull();
    expect(resultado.isError).toBe(false);

    act(() => tree.unmount());
    queryClient.clear();
});
