import { buildFuelEntryFormData, parseDecimalBR, parseOdometer, validateFuelForm, type FuelFormState } from '../fuelEntryForm';

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
        ) as unknown as FakeFormData;
        expect(fd.entries).toEqual([
            ['fuelType', 'ETHANOL'], ['liters', '45.5'], ['totalValue', '250.00'], ['odometerKm', '48210'],
            ['fullTank', 'false'], ['paidBy', 'DRIVER'], ['stationName', 'Posto Sul'],
            ['receipt', { uri: 'file://c.jpg', name: 'nota.jpg', type: 'image/jpeg' }],
        ]);
    });

    it('sem posto, o campo não vai', () => {
        const fd = buildFuelEntryFormData(
            { fuelType: 'DIESEL', liters: 10, totalValue: 60, odometerKm: 1, fullTank: true, paidBy: 'COMPANY' },
            { uri: 'u', name: 'n.jpg', type: 'image/jpeg' },
        ) as unknown as FakeFormData;
        expect(fd.entries.map(([k]) => k)).not.toContain('stationName');
    });
});
