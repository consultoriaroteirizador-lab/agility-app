import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TestRenderer, { act } from 'react-test-renderer';

import { KEY_FUEL_ENTRIES } from '@/domain/queryKeys';

import { useCreateFuelEntry } from '../useCreateFuelEntry';

jest.mock('../../fuelEntryAPI', () => ({ fuelEntryAPI: { create: jest.fn() } }));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { fuelEntryAPI } = require('../../fuelEntryAPI');

const vars = {
    payload: { fuelType: 'DIESEL' as const, liters: 10, totalValue: 60, odometerKm: 1, fullTank: true, paidBy: 'COMPANY' as const },
    photo: { uri: 'u', width: 1, height: 1 },
};

function setup() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    let hook!: ReturnType<typeof useCreateFuelEntry>;
    function Probe() { hook = useCreateFuelEntry(); return null; }
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => { tree = TestRenderer.create(<QueryClientProvider client={queryClient}><Probe /></QueryClientProvider>); });
    return { queryClient, invalidate, hook: () => hook, tree };
}

it('rejeita no erro do back e ainda invalida (o contexto traz o último odômetro)', async () => {
    fuelEntryAPI.create.mockRejectedValue({ success: false, error: { message: 'x' } });
    const { invalidate, hook, tree, queryClient } = setup();
    await act(async () => { await expect(hook().createFuelEntry(vars)).rejects.toEqual({ success: false, error: { message: 'x' } }); });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: [KEY_FUEL_ENTRIES] });
    act(() => tree.unmount()); queryClient.clear();
});

it('sucesso devolve o lançamento', async () => {
    fuelEntryAPI.create.mockResolvedValue({ id: 'e1' });
    const { hook, tree, queryClient } = setup();
    await act(async () => { await expect(hook().createFuelEntry(vars)).resolves.toEqual({ id: 'e1' }); });
    expect(fuelEntryAPI.create).toHaveBeenCalledWith(vars.payload, vars.photo);
    act(() => tree.unmount()); queryClient.clear();
});
