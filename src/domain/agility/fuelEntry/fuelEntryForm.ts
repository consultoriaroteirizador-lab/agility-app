import type { FuelPayer, FuelType, ReceiptPhoto } from './dto/types';

export const FUEL_TYPES: FuelType[] = ['DIESEL', 'GASOLINE', 'ETHANOL'];
const STATION_MAX = 120; // o @MaxLength do DTO; acima disso o back responde em inglês

export interface FuelFormState {
    fuelType: FuelType | null;
    litersText: string;
    totalValueCents: number | null;
    odometerText: string;
    fullTank: boolean;
    paidBy: FuelPayer;
    stationName: string;
    photo: ReceiptPhoto | null;
}

export interface FuelEntryPayload {
    fuelType: FuelType;
    liters: number;
    totalValue: number;
    odometerKm: number;
    fullTank: boolean;
    paidBy: FuelPayer;
    stationName?: string;
}

/**
 * Número digitado em pt-BR. Vírgula é o decimal e ponto é milhar ("1.234,56"). Sem vírgula, ponto seguido de
 * grupos de 3 dígitos é milhar ("1.000") e qualquer outro ponto é decimal ("45.5", teclado em inglês).
 */
export function parseDecimalBR(text: string): number | null {
    const t = text.trim();
    let normalized: string;
    if (/^\d{1,3}(\.\d{3})*,\d+$|^\d+,\d+$/.test(t)) normalized = t.replace(/\./g, '').replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(t)) normalized = t.replace(/\./g, '');
    else if (/^\d+(\.\d+)?$/.test(t)) normalized = t;
    else return null;
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
}

/** Odômetro do painel: km inteiro, com ou sem ponto de milhar ("48.210"). */
export function parseOdometer(text: string): number | null {
    const t = text.trim();
    if (!/^\d{1,3}(\.\d{3})*$|^\d+$/.test(t)) return null;
    return Number(t.replace(/\./g, ''));
}

/**
 * O que falta para enviar, um motivo por vez, na ordem da tela. As regras de valor (2× o tanque, tetos)
 * ficam no back, que responde em português; aqui só o que o formulário consegue saber sozinho.
 */
export function validateFuelForm(s: FuelFormState): { payload: FuelEntryPayload | null; problem: string | null } {
    const fail = (problem: string) => ({ payload: null, problem });
    if (!s.fuelType) return fail('Escolha o combustível');
    const liters = parseDecimalBR(s.litersText);
    if (liters === null || liters <= 0) return fail('Informe os litros (ex.: 45,5)');
    if (s.totalValueCents === null || s.totalValueCents <= 0) return fail('Informe o valor total');
    const odometerKm = parseOdometer(s.odometerText);
    if (odometerKm === null) return fail('Informe o odômetro do painel, em km');
    const station = s.stationName.trim();
    if (station.length > STATION_MAX) return fail(`O nome do posto tem no máximo ${STATION_MAX} caracteres`);
    if (!s.photo) return fail('Tire a foto da nota para enviar');
    return {
        payload: {
            fuelType: s.fuelType,
            liters,
            totalValue: s.totalValueCents / 100,
            odometerKm,
            fullTank: s.fullTank,
            paidBy: s.paidBy,
            ...(station ? { stationName: station } : {}),
        },
        problem: null,
    };
}

/**
 * Multipart do POST /fuel-entries/me. O back converte com Number(): número vai com PONTO ("45,5" vira NaN e
 * dá 400) e boolean vai como "true"/"false".
 */
export function buildFuelEntryFormData(p: FuelEntryPayload, receipt: { uri: string; name: string; type: string }): FormData {
    const fd = new FormData();
    fd.append('fuelType', p.fuelType);
    fd.append('liters', String(p.liters));
    fd.append('totalValue', p.totalValue.toFixed(2));
    fd.append('odometerKm', String(p.odometerKm));
    fd.append('fullTank', p.fullTank ? 'true' : 'false');
    fd.append('paidBy', p.paidBy);
    if (p.stationName) fd.append('stationName', p.stationName);
    // @ts-expect-error: o FormData do React Native aceita { uri, name, type } como arquivo
    fd.append('receipt', receipt);
    return fd;
}
