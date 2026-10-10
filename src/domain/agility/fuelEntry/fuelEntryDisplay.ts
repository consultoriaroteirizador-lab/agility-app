import { erroDeRede, erroDeTimeout, mensagemDaApi } from '@/api/apiErrorMessage';
import { appDayKey, formatHHmm } from '@/functions/dateFunctions';

import type { FuelEntry, FuelType } from './dto/types';

export const FUEL_LABEL: Record<FuelType, string> = { DIESEL: 'Diesel', GASOLINE: 'Gasolina', ETHANOL: 'Etanol' };

export const OFFLINE_MESSAGE = 'Sem internet. O que você digitou continua aqui: conecte-se e toque em Enviar de novo.';
// Timeout: a request saiu e pode ter sido gravada. "Toque em Enviar de novo" criaria um segundo lançamento.
export const TIMEOUT_MESSAGE =
    'O envio demorou demais e não deu para confirmar se o abastecimento foi registrado. Confira em Meus abastecimentos antes de enviar de novo.';
const FALLBACK = 'Não foi possível registrar o abastecimento. Tente novamente.';

/** Sem Intl.NumberFormat: o Hermes de aparelho antigo não garante o locale pt-BR. */
export function formatDecimalBR(n: number, maxDecimals: number): string {
    let fixed = n.toFixed(maxDecimals);
    if (fixed.includes('.')) fixed = fixed.replace(/0+$/, '').replace(/\.$/, '');
    const [int, dec] = fixed.split('.');
    const intBR = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return dec ? `${intBR},${dec}` : intBR;
}

export const formatLiters = (n: number) => `${formatDecimalBR(n, 3)} L`;
export const formatKm = (n: number) => `${formatDecimalBR(n, 0)} km`;

/** "dd/MM/yyyy HH:mm" no fuso da operação, nunca no do aparelho. */
export function formatFilledAt(iso: string): string {
    const day = appDayKey(iso);
    if (!day) return '';
    const [y, m, d] = day.split('-');
    return `${d}/${m}/${y} ${formatHHmm(iso)}`;
}

export function inconsistencyText(e: Pick<FuelEntry, 'odometerInconsistent' | 'previousOdometerKm'>): string | null {
    if (!e.odometerInconsistent || e.previousOdometerKm === null) return null;
    return `Odômetro abaixo do anterior (${formatKm(e.previousOdometerKm)}): a central vai revisar.`;
}

type ErroComCampos = { error?: { validationErrors?: { message?: string }[] } };

/** Sem rede, a frase própria; recusa do DTO, a frase de cada campo; senão a mensagem do back. */
export function fuelEntryErrorMessage(error: unknown): string {
    if (erroDeTimeout(error)) return TIMEOUT_MESSAGE;
    if (erroDeRede(error)) return OFFLINE_MESSAGE;
    const campos = (error as ErroComCampos | undefined)?.error?.validationErrors
        ?.map((v) => v.message)
        .filter((m): m is string => !!m);
    if (campos && campos.length > 0) return campos.join('\n');
    return mensagemDaApi(error, FALLBACK);
}

const CONTEXT_FALLBACK = 'Não foi possível carregar os dados do seu veículo. Tente novamente.';

/** Painel da tela sem contexto: nada foi digitado ainda, então sem rede vale a frase da conexão, não a do envio. */
export function fuelContextErrorMessage(error: unknown): string {
    return mensagemDaApi(error, CONTEXT_FALLBACK);
}

export function fuelEntrySuccessToast(e: Pick<FuelEntry, 'odometerInconsistent' | 'previousOdometerKm'>) {
    const message = e.odometerInconsistent && e.previousOdometerKm !== null
        ? `Abastecimento registrado, mas o odômetro está abaixo do último (${formatKm(e.previousOdometerKm)}). A central vai revisar.`
        : 'Abastecimento registrado.';
    return { message, type: 'success' as const };
}
