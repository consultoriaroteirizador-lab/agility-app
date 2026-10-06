import type { DriverFreightShareResponse } from '@/domain/agility/wallet/dto/response/wallet.response';
import { FreightShareStatus } from '@/domain/agility/wallet/dto/types';
import type { StatusColorConfig } from '@/theme';

const STATUS: Record<FreightShareStatus, StatusColorConfig> = {
    [FreightShareStatus.A_LIBERAR]: { label: 'A liberar', textColor: 'yellow100', bgColor: 'yellow20' },
    [FreightShareStatus.LIBERADA]: { label: 'Liberado', textColor: 'tertiary100', bgColor: 'tertiary20' },
    [FreightShareStatus.CANCELADA]: { label: 'Cancelado', textColor: 'gray400', bgColor: 'gray50' },
    [FreightShareStatus.SEM_VALOR]: { label: 'Sem valor', textColor: 'gray400', bgColor: 'gray50' },
};

export interface FreightShareDisplay {
    /** Nome da rota, ou o código. Nunca o id. */
    route: string;
    status: StatusColorConfig;
    /** Centavos. `null` = não mostrar valor (cancelada, ou sem valor definido). */
    amountCents: number | null;
    stops: string | null;
    note: string | null;
    /** Quando foi liberada. */
    date: string | null;
}

/** A parte do motorista numa rota (F6). Ele vê o motivo do ajuste/cancelamento, não o sugerido (R8 da F5c). */
export function describeFreightShare(s: DriverFreightShareResponse): FreightShareDisplay {
    const base = {
        route: s.routingName?.trim() || s.routingCode?.trim() || 'Rota sem nome',
        status: STATUS[s.status] ?? STATUS[FreightShareStatus.A_LIBERAR],
        stops: s.stopsTotal > 0 ? `${s.stopsCompleted} de ${s.stopsTotal} paradas` : null,
    };
    switch (s.status) {
        case FreightShareStatus.LIBERADA: {
            const motivo = s.adjustReason?.trim();
            return { ...base, amountCents: s.releasedAmountCents ?? 0, note: motivo ? `Ajuste da empresa: ${motivo}` : null, date: s.releasedAt };
        }
        case FreightShareStatus.CANCELADA: {
            const motivo = s.cancelReason?.trim();
            return { ...base, amountCents: null, note: motivo ? `Cancelado pela empresa: ${motivo}` : 'Cancelado pela empresa.', date: null };
        }
        case FreightShareStatus.SEM_VALOR:
            // Rota sem valor (o caso comum) ou parcela zerada; continua na fila do operador.
            return { ...base, amountCents: null, note: 'A empresa ainda não definiu um valor para a sua parte nesta rota.', date: null };
        default:
            return { ...base, amountCents: s.amountToReleaseCents, note: 'Esperando a empresa liberar', date: null };
    }
}
