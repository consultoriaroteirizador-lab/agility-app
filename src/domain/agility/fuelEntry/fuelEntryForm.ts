import type { FuelEntry, FuelPayer, FuelType, ReceiptPhoto } from './dto/types';

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
export function buildFuelEntryFormData(p: FuelEntryPayload, receipt: { uri: string; name: string; type: string }, idempotencyKey: string): FormData {
    const fd = new FormData();
    fd.append('fuelType', p.fuelType);
    fd.append('liters', String(p.liters));
    fd.append('totalValue', p.totalValue.toFixed(2));
    fd.append('odometerKm', String(p.odometerKm));
    fd.append('fullTank', p.fullTank ? 'true' : 'false');
    fd.append('paidBy', p.paidBy);
    if (p.stationName) fd.append('stationName', p.stationName);
    fd.append('idempotencyKey', idempotencyKey);
    // @ts-expect-error: o FormData do React Native aceita { uri, name, type } como arquivo
    fd.append('receipt', receipt);
    return fd;
}

/**
 * O lançamento devolvido difere do que acabou de ser enviado? Com a mesma chave de idempotência o back devolve o
 * lançamento da tentativa anterior, mesmo que o motorista tenha editado o formulário depois. Compara os campos
 * numéricos na precisão do banco, depois de Number(), porque o back pode serializar decimal como texto.
 */
export function entryDiffersFromPayload(
    entry: Pick<FuelEntry, 'totalValue' | 'liters' | 'paidBy' | 'odometerKm'>,
    payload: Pick<FuelEntryPayload, 'totalValue' | 'liters' | 'paidBy' | 'odometerKm'>,
): boolean {
    return (
        // O back arredonda para a precisao do banco: valor Decimal(12,2) (o payload sai de centavos inteiros, entao centavos sao exatos);
        // litros Decimal(3) por tolerancia de meio milesimo, porque Math.round(x * 1000) erra quando o float cai abaixo de .5 (0.5005 * 1000 = 500.4999...).
        Math.round(Number(entry.totalValue) * 100) !== Math.round(payload.totalValue * 100) ||
        !(Math.abs(Number(entry.liters) - payload.liters) <= 0.0005 + 1e-9) ||
        entry.paidBy !== payload.paidBy ||
        entry.odometerKm === null ||
        Number(entry.odometerKm) !== payload.odometerKm
    );
}
