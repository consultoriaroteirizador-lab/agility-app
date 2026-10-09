const mockGet = jest.fn();
const mockPost = jest.fn();
jest.mock('@/api/apiConfig', () => ({ apiAgility: { get: (...a: unknown[]) => mockGet(...a), post: (...a: unknown[]) => mockPost(...a) } }));
jest.mock('../receiptPhoto', () => ({ compressReceipt: jest.fn(async () => 'file://comprimida.jpg') }));

import { fuelEntryAPI } from '../fuelEntryAPI';

class FakeFormData {
    entries: [string, unknown][] = [];
    append(k: string, v: unknown) { this.entries.push([k, v]); }
}
const original = globalThis.FormData;
beforeAll(() => { (globalThis as any).FormData = FakeFormData; });
afterAll(() => { globalThis.FormData = original; });
beforeEach(() => { mockGet.mockReset(); mockPost.mockReset(); });

it('contexto: tira o envelope', async () => {
    mockGet.mockResolvedValue({ data: { success: true, result: { vehicleId: 'v1', plate: 'ABC1D23', defaultFuelType: 'DIESEL', lastOdometerKm: 48210, rechargeOnly: false } } });
    await expect(fuelEntryAPI.getContext()).resolves.toMatchObject({ plate: 'ABC1D23', lastOdometerKm: 48210 });
    expect(mockGet).toHaveBeenCalledWith('/fuel-entries/me/context');
});

it('envio: um POST multipart com a foto comprimida em receipt', async () => {
    mockPost.mockResolvedValue({ data: { success: true, result: { id: 'e1', odometerInconsistent: false } } });
    const r = await fuelEntryAPI.create(
        { fuelType: 'DIESEL', liters: 45.5, totalValue: 250, odometerKm: 48210, fullTank: true, paidBy: 'COMPANY' },
        { uri: 'file://o.jpg', width: 3000, height: 4000 },
    );
    expect(r).toEqual({ id: 'e1', odometerInconsistent: false });
    const [url, body, config] = mockPost.mock.calls[0];
    expect(url).toBe('/fuel-entries/me');
    expect(config).toEqual({ headers: { 'Content-Type': 'multipart/form-data' } });
    const receipt = (body as FakeFormData).entries.find(([k]) => k === 'receipt')?.[1] as { uri: string; name: string; type: string };
    expect(receipt.uri).toBe('file://comprimida.jpg');
    expect(receipt.type).toBe('image/jpeg');
    expect(receipt.name).toMatch(/^nota_\d+\.jpg$/);
});

it('lista: converte { data, total } na paginação do app', async () => {
    mockGet.mockResolvedValue({ data: { success: true, result: { data: [{ id: 'a' }], total: 41 } } });
    await expect(fuelEntryAPI.listMine(2, 20)).resolves.toEqual({ data: [{ id: 'a' }], meta: { page: 2, totalPages: 3, limit: 20, total: 41 } });
    expect(mockGet).toHaveBeenCalledWith('/fuel-entries/me', { params: { page: 2, limit: 20 } });
});

it('lista vazia: uma página só', async () => {
    mockGet.mockResolvedValue({ data: { success: true, result: { data: [], total: 0 } } });
    await expect(fuelEntryAPI.listMine(1, 20)).resolves.toEqual({ data: [], meta: { page: 1, totalPages: 1, limit: 20, total: 0 } });
});
