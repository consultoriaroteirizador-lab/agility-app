import type { WalletResponse } from '@/domain/agility/wallet/dto/response/wallet.response';
import { formatDate } from '@/utils/formatDate';

/** Por quantos dias a troca aparece como ALERTA (R2). Depois, só o registro em cinza. */
export const PIX_CHANGE_ALERT_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface PixKeyChangeNotice {
    /** Troca nos últimos `PIX_CHANGE_ALERT_DAYS` dias: banner de alerta. */
    recent: boolean;
    title: string;
    text: string;
}

type W = Pick<WalletResponse, 'pixKey' | 'pixKeyChangedAt' | 'previousPixKeyMasked'>;

/**
 * Troca de chave PIX é o passo do golpe que redireciona o saque (F3, Ruling 26). O back registra
 * `pixKeyChangedAt` e a anterior mascarada; o primeiro cadastro também conta como troca, por
 * isso o texto distingue cadastro, troca e remoção. A anterior aparece como o back mascarou.
 */
export function pixKeyChangeNotice(w: W | null | undefined, now: Date = new Date()): PixKeyChangeNotice | null {
    const changedAt = w?.pixKeyChangedAt;
    if (!changedAt) return null;
    const when = new Date(changedAt);
    if (isNaN(when.getTime())) return null;

    const quando = formatDate(when);
    const anterior = w?.previousPixKeyMasked?.trim() || null;
    const atual = w?.pixKey?.trim() || null;

    let title: string;
    let base: string;
    if (!atual) {
        title = 'Chave PIX removida';
        base = `A chave PIX da sua carteira foi removida em ${quando}.`;
    } else if (!anterior) {
        title = 'Chave PIX cadastrada';
        base = `A chave PIX da sua carteira foi cadastrada em ${quando}.`;
    } else {
        title = 'Chave PIX alterada';
        base = `A chave PIX da sua carteira foi alterada em ${quando}. A anterior era ${anterior}.`;
    }

    const recent = now.getTime() - when.getTime() < PIX_CHANGE_ALERT_DAYS * DAY_MS;
    return { recent, title, text: recent ? `${base} Se não foi você, fale com a central antes de pedir saque.` : base };
}
