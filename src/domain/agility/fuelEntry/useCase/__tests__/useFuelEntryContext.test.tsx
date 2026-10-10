import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TestRenderer, { act } from 'react-test-renderer';

import { useFuelEntryContext } from '../useFuelEntryContext';

jest.mock('../../fuelEntryAPI', () => ({ fuelEntryAPI: { getContext: jest.fn() } }));
jest.mock('@/services', () => ({
    useAuthCredentialsService: () => ({ authCredentials: { accessToken: 'token', tenantId: 'tenant' } }),
}));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { fuelEntryAPI } = require('../../fuelEntryAPI');

const CONTEXTO = { vehicleId: 'v1', plate: 'ABC1D23', defaultFuelType: 'DIESEL', lastOdometerKm: 48000, rechargeOnly: false };
const SEM_REDE = { success: false, error: { message: 'Sem conexão com o servidor.', code: 'AU-000' } };
const FORA_DO_AR = { success: false, error: { message: 'Erro interno', code: 'N/A' }, response: { status: 503 } };
const SEM_VEICULO = { success: false, error: { message: 'Você não tem veículo associado. Fale com a central.', code: 'N/A' }, response: { status: 422 } };

let queryClient: QueryClient;
let tree: TestRenderer.ReactTestRenderer;
let hook!: ReturnType<typeof useFuelEntryContext>;

beforeEach(() => {
    fuelEntryAPI.getContext.mockReset();
    // retryDelay 0: o hook decide SE tenta de novo; o teste não espera o intervalo.
    queryClient = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } });
});

afterEach(() => {
    act(() => tree.unmount());
    queryClient.clear();
});

function render() {
    function Probe() {
        hook = useFuelEntryContext();
        return null;
    }
    act(() => {
        tree = TestRenderer.create(
            <QueryClientProvider client={queryClient}>
                <Probe />
            </QueryClientProvider>,
        );
    });
}

async function ate(cond: () => boolean) {
    for (let i = 0; i < 100 && !cond(); i++) {
        await act(async () => {
            await new Promise((r) => setTimeout(r, 10));
        });
    }
}

it.each([
    ['sem rede', SEM_REDE],
    ['servidor fora do ar (5xx)', FORA_DO_AR],
])('%s: tenta de novo antes de desistir', async (_n, erro) => {
    fuelEntryAPI.getContext.mockRejectedValue(erro);
    render();
    await ate(() => hook.isError);
    expect(hook.isError).toBe(true);
    expect(fuelEntryAPI.getContext).toHaveBeenCalledTimes(3);
});

it('422 (sem veículo, outra filial, elétrico) é resposta definitiva: uma busca só', async () => {
    fuelEntryAPI.getContext.mockRejectedValue(SEM_VEICULO);
    render();
    await ate(() => hook.isError);
    expect(hook.isError).toBe(true);
    expect(fuelEntryAPI.getContext).toHaveBeenCalledTimes(1);
});

it('refetchIfFailed: depois de uma falha, busca de novo e carrega o contexto', async () => {
    fuelEntryAPI.getContext.mockRejectedValueOnce(SEM_VEICULO).mockResolvedValue(CONTEXTO);
    render();
    await ate(() => hook.isError);
    act(() => hook.refetchIfFailed());
    await ate(() => hook.context !== undefined);
    expect(hook.context).toEqual(CONTEXTO);
    expect(fuelEntryAPI.getContext).toHaveBeenCalledTimes(2);
});

it('refetchIfFailed: com o contexto carregado, não busca de novo', async () => {
    fuelEntryAPI.getContext.mockResolvedValue(CONTEXTO);
    render();
    await ate(() => hook.context !== undefined);
    act(() => hook.refetchIfFailed());
    await ate(() => false);
    expect(fuelEntryAPI.getContext).toHaveBeenCalledTimes(1);
});
