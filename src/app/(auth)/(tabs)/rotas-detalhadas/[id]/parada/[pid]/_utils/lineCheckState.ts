import { mensagemDaApi } from '@/api/apiErrorMessage';
import type { MaterialStatus, ServiceLine } from '@/domain/agility/service/dto/response/service-line.response';

/** As linhas da parada e a conferência delas (o `linesState` do `ParadaContext`). */
export interface LinesState {
    lines: ServiceLine[];
    loading: boolean;
    allChecked: boolean;
}

export type LineCheckData = { status: MaterialStatus; actualQuantity?: number; notes?: string; photoProof?: string };

export const CHECK_FALLBACK_MESSAGE = 'Não foi possível conferir o item. Tente de novo.';

/** `allChecked` como sempre foi: nenhuma linha `PENDING` (a lista vazia conta como conferida). */
export function linesStateOf(lines: ServiceLine[], loading = false): LinesState {
    return { lines, loading, allChecked: lines.every((l) => l.status !== 'PENDING') };
}

/** A marcação otimista. O `marker` vai no `checkedAt` e identifica esta chamada para o `revertCheck`. */
export function applyCheck(state: LinesState, lineId: string, data: LineCheckData, marker: string): LinesState {
    const lines = state.lines.map((l) =>
        l.id === lineId
            ? {
                ...l,
                status: data.status,
                actualQuantity: data.actualQuantity,
                checkNotes: data.notes,
                checkPhotoProof: data.photoProof,
                checkedAt: marker,
            }
            : l,
    );
    return linesStateOf(lines, state.loading);
}

/**
 * Desfaz a marcação de uma chamada que falhou: a linha volta a ser como era antes dela. Só se a linha
 * ainda estiver como esta chamada a deixou (`checkedAt === marker`): um re-check posterior, ou dados
 * novos do servidor, ganham da falha atrasada.
 */
export function revertCheck(state: LinesState, lineId: string, previous: ServiceLine, marker: string): LinesState {
    const atual = state.lines.find((l) => l.id === lineId);
    if (!atual || atual.checkedAt !== marker) return state;
    return linesStateOf(state.lines.map((l) => (l.id === lineId ? previous : l)), state.loading);
}

type RunLineCheckArgs = {
    lineId: string;
    data: LineCheckData;
    /** A linha antes da marcação; sem ela não há o que devolver. */
    previous: ServiceLine | undefined;
    marker: string;
    update: (fn: (state: LinesState) => LinesState) => void;
    send: () => Promise<unknown>;
    notifyError: (message: string) => void;
};

/** O check inteiro (fase 3C, C5): marca, envia e, na falha, desfaz só esta marcação e avisa uma vez. */
export async function runLineCheck({ lineId, data, previous, marker, update, send, notifyError }: RunLineCheckArgs): Promise<boolean> {
    update((state) => applyCheck(state, lineId, data, marker));
    try {
        await send();
        return true;
    } catch (error) {
        if (previous) update((state) => revertCheck(state, lineId, previous, marker));
        notifyError(mensagemDaApi(error, CHECK_FALLBACK_MESSAGE));
        return false;
    }
}
