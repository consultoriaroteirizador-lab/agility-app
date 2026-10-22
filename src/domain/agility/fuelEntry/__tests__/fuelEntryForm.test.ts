import { buildFuelEntryFormData, entryDiffersFromPayload, isPricePerLiterPlausible, parseDecimalBR, parseOdometer, pricePerLiterCents, validateFuelForm, type FuelFormState } from '../fuelEntryForm';

class FakeFormData {
    entries: [string, unknown][] = [];
    append(k: string, v: unknown) { this.entries.push([k, v]); }
}

describe('parseDecimalBR', () => {
    it.each([
        ['45,5', 45.5], ['45.5', 45.5], ['45', 45], ['1.234,56', 1234.56], ['1.000', 1000], [' 45,500 ', 45.5],
    ])('%p vira %p', (texto, esperado) => expect(parseDecimalBR(texto)).toBe(esperado));

    it.each(['', 'abc', '45,5,1', '4 5', '-3', '1.23.4'])('%p é inválido', (texto) => expect(parseDecimalBR(texto)).toBeNull());
});

describe('parseOdometer', () => {
    it.each([['48210', 48210], ['48.210', 48210], ['1.048.210', 1048210]])('%p vira %p', (t, e) => expect(parseOdometer(t)).toBe(e));
    it.each(['', '48,2', '48.21', 'abc'])('%p é inválido', (t) => expect(parseOdometer(t)).toBeNull());
});

const valido: FuelFormState = {
    fuelType: 'DIESEL', litersText: '45,5', totalValueCents: 25000, odometerText: '48.210',
    fullTank: true, paidBy: 'COMPANY', stationName: '', photo: { uri: 'file://nota.jpg', width: 3000, height: 4000 },
};

describe('validateFuelForm', () => {
    it('monta o payload com ponto decimal, reais e km inteiro', () => {
        expect(validateFuelForm(valido)).toEqual({
            payload: { fuelType: 'DIESEL', liters: 45.5, totalValue: 250, odometerKm: 48210, fullTank: true, paidBy: 'COMPANY' },
            problem: null,
        });
    });

    it('posto vai aparado e só quando preenchido', () => {
        expect(validateFuelForm({ ...valido, stationName: '  Posto Sul ' }).payload?.stationName).toBe('Posto Sul');
    });

    it.each<[Partial<FuelFormState>, string]>([
        [{ fuelType: null }, 'Escolha o combustível'],
        [{ litersText: '' }, 'Informe os litros (ex.: 45,5)'],
        [{ litersText: '0' }, 'Informe os litros (ex.: 45,5)'],
        [{ totalValueCents: null }, 'Informe o valor total'],
        [{ totalValueCents: 0 }, 'Informe o valor total'],
        [{ odometerText: '48,2' }, 'Informe o odômetro do painel, em km'],
        [{ stationName: 'x'.repeat(121) }, 'O nome do posto tem no máximo 120 caracteres'],
        [{ photo: null }, 'Tire a foto da nota para enviar'],
    ])('%p: sem payload e com o motivo', (patch, motivo) => {
        expect(validateFuelForm({ ...valido, ...patch })).toEqual({ payload: null, problem: motivo });
    });
});

describe('buildFuelEntryFormData', () => {
    const original = globalThis.FormData;
    beforeAll(() => { (globalThis as any).FormData = FakeFormData; });
    afterAll(() => { globalThis.FormData = original; });

    it('números com ponto, boolean como texto e a foto no campo receipt', () => {
        const fd = buildFuelEntryFormData(
            { fuelType: 'ETHANOL', liters: 45.5, totalValue: 250, odometerKm: 48210, fullTank: false, paidBy: 'DRIVER', stationName: 'Posto Sul' },
            { uri: 'file://c.jpg', name: 'nota.jpg', type: 'image/jpeg' },
            'key-1',
        ) as unknown as FakeFormData;
        expect(fd.entries).toEqual([
            ['fuelType', 'ETHANOL'], ['liters', '45.5'], ['totalValue', '250.00'], ['odometerKm', '48210'],
            ['fullTank', 'false'], ['paidBy', 'DRIVER'], ['stationName', 'Posto Sul'], ['idempotencyKey', 'key-1'],
            ['receipt', { uri: 'file://c.jpg', name: 'nota.jpg', type: 'image/jpeg' }],
        ]);
    });

    it('sem posto, o campo não vai', () => {
        const fd = buildFuelEntryFormData(
            { fuelType: 'DIESEL', liters: 10, totalValue: 60, odometerKm: 1, fullTank: true, paidBy: 'COMPANY' },
            { uri: 'u', name: 'n.jpg', type: 'image/jpeg' },
            'key-2',
        ) as unknown as FakeFormData;
        expect(fd.entries.map(([k]) => k)).not.toContain('stationName');
    });
});

describe('entryDiffersFromPayload', () => {
    const payload = { totalValue: 250, liters: 45.5, paidBy: 'COMPANY' as const, odometerKm: 48210 };
    const entry = { ...payload };
    it('igual: false (inclusive numero vindo como texto)', () => {
        expect(entryDiffersFromPayload(entry, payload)).toBe(false);
        expect(entryDiffersFromPayload({ ...entry, liters: '45.500' as unknown as number, totalValue: '250.00' as unknown as number }, payload)).toBe(false);
    });
    it('precisao do banco: litros em 3 casas e valor em 2 (o back arredonda)', () => {
        const p = (liters: number, totalValue: number) => ({ ...payload, liters, totalValue });
        expect(entryDiffersFromPayload({ ...entry, liters: 45.556 }, p(45.5555, 250))).toBe(false);
        expect(entryDiffersFromPayload({ ...entry, liters: '45.556' as unknown as number }, p(45.5555, 250))).toBe(false);
        expect(entryDiffersFromPayload({ ...entry, liters: 45.556 }, p(45.555, 250))).toBe(true);
        expect(entryDiffersFromPayload({ ...entry, liters: 0.501 }, p(0.5005, 250))).toBe(false);
        expect(entryDiffersFromPayload({ ...entry, liters: undefined as unknown as number }, p(45.5, 250))).toBe(true);
        expect(entryDiffersFromPayload({ ...entry, liters: "abc" as unknown as number }, p(45.5, 250))).toBe(true);
        expect(entryDiffersFromPayload({ ...entry, totalValue: 250.02 }, p(45.5, 250.01))).toBe(true);
    });
    it.each([
        ['totalValue', { totalValue: 250.01 }],
        ['liters', { liters: 45.501 }],
        ['paidBy', { paidBy: 'DRIVER' as const }],
        ['odometerKm', { odometerKm: 48211 }],
        ['odometerKm nulo', { odometerKm: null as unknown as number }],
    ])('%s diferente: true', (_n, patch) => {
        expect(entryDiffersFromPayload({ ...entry, ...patch }, payload)).toBe(true);
    });
});

describe('pricePerLiterCents', () => {
    it('312,50 para 50 L: 625 centavos', () => expect(pricePerLiterCents('50', 31250)).toBe(625));
    it('6,25 para 50 L: 13 centavos (arredonda meio para cima)', () => expect(pricePerLiterCents('50', 625)).toBe(13));
    it('aceita litros com virgula', () => expect(pricePerLiterCents('45,5', 25000)).toBe(549));
    it.each(['', '0', '0,0', 'abc'])('litros %p: null', (l) => expect(pricePerLiterCents(l, 25000)).toBeNull());
    it.each([null, 0])('valor %p: null', (v) => expect(pricePerLiterCents('50', v)).toBeNull());
});

describe('isPricePerLiterPlausible', () => {
    it.each([[300, true], [1200, true], [625, true], [299, false], [1201, false]])('%p centavos: %p', (c, e) =>
        expect(isPricePerLiterPlausible(c)).toBe(e));
});
