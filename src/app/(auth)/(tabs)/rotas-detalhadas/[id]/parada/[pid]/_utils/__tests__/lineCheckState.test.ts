import type { ServiceLine } from '@/domain/agility/service/dto/response/service-line.response';

import {
    applyCheck,
    CHECK_FALLBACK_MESSAGE,
    linesStateOf,
    revertCheck,
    runLineCheck,
    type LinesState,
} from '../lineCheckState';

function linha(over: Partial<ServiceLine>): ServiceLine {
    return { id: 'l', material: 'Item', quantity: 1, status: 'PENDING', createdAt: '', updatedAt: '', ...over } as ServiceLine;
}

function estado(lines: ServiceLine[], loading = false): LinesState {
    return linesStateOf(lines, loading);
}

/** Um `setState` funcional de mentira, para o `runLineCheck`. */
function harness(inicial: LinesState) {
    let atual = inicial;
    return {
        get: () => atual,
        update: (fn: (s: LinesState) => LinesState) => { atual = fn(atual); },
    };
}

function adiada() {
    let reject!: (e: unknown) => void;
    const promise = new Promise<unknown>((_, r) => { reject = r; });
    return { promise, reject };
}

const ERRO_DO_BACK = { success: false, error: { message: 'Item não pertence a este pedido', code: 'X' } };
const SEM_REDE = { success: false, error: { message: 'Sem conexão com o servidor. Verifique sua internet e tente novamente.', code: 'AU-000' } };
const SEM_MENSAGEM = { success: false, error: { message: 'Erro desconhecido', code: 'N/A' } };

describe('linesStateOf', () => {
    it('allChecked só sem PENDING; a lista vazia conta como conferida, como antes', () => {
        expect(linesStateOf([linha({ status: 'CHECKED' }), linha({ status: 'DAMAGED' })]).allChecked).toBe(true);
        expect(linesStateOf([linha({ status: 'CHECKED' }), linha({ status: 'PENDING' })]).allChecked).toBe(false);
        expect(linesStateOf([]).allChecked).toBe(true);
        expect(linesStateOf([], true).loading).toBe(true);
    });
});

describe('applyCheck', () => {
    it('marca só a linha pedida, com o marcador no checkedAt, e recalcula allChecked', () => {
        const s = applyCheck(estado([linha({ id: 'a' }), linha({ id: 'b', status: 'CHECKED' })]), 'a', { status: 'PARTIAL', actualQuantity: 1, notes: 'faltou 1', photoProof: 'f' }, 'm1');
        expect(s.lines[0]).toMatchObject({ id: 'a', status: 'PARTIAL', actualQuantity: 1, checkNotes: 'faltou 1', checkPhotoProof: 'f', checkedAt: 'm1' });
        expect(s.lines[1]).toMatchObject({ id: 'b', status: 'CHECKED' });
        expect(s.allChecked).toBe(true);
    });

    it('preserva o loading', () => {
        expect(applyCheck(estado([linha({ id: 'a' })], true), 'a', { status: 'CHECKED' }, 'm').loading).toBe(true);
    });
});

describe('revertCheck', () => {
    it('devolve a linha como era: o re-check de CHECKED que falha volta a CHECKED com a nota antiga', () => {
        const antes = linha({ id: 'a', status: 'CHECKED', checkNotes: 'ok', checkedAt: '2026-10-14T10:00:00.000Z' });
        const marcado = applyCheck(estado([antes]), 'a', { status: 'DAMAGED', notes: 'amassado' }, 'm1');
        const desfeito = revertCheck(marcado, 'a', antes, 'm1');
        expect(desfeito.lines[0]).toEqual(antes);
    });

    it('não mexe se outra chamada marcou a linha depois (marcador diferente)', () => {
        const antes = linha({ id: 'a' });
        const segunda = applyCheck(applyCheck(estado([antes]), 'a', { status: 'MISSING' }, 'm1'), 'a', { status: 'CHECKED' }, 'm2');
        expect(revertCheck(segunda, 'a', antes, 'm1')).toBe(segunda);
    });

    it('recalcula allChecked', () => {
        const antes = linha({ id: 'a' });
        const marcado = applyCheck(estado([antes]), 'a', { status: 'CHECKED' }, 'm1');
        expect(marcado.allChecked).toBe(true);
        expect(revertCheck(marcado, 'a', antes, 'm1').allChecked).toBe(false);
    });
});

describe('runLineCheck', () => {
    it('sucesso: a marcação fica e ninguém é avisado', async () => {
        const h = harness(estado([linha({ id: 'a' })]));
        const notifyError = jest.fn();
        const ok = await runLineCheck({ lineId: 'a', data: { status: 'CHECKED' }, previous: h.get().lines[0], marker: 'm1', update: h.update, send: async () => ({ success: true }), notifyError });
        expect(ok).toBe(true);
        expect(h.get().lines[0].status).toBe('CHECKED');
        expect(notifyError).not.toHaveBeenCalled();
    });

    it('a marcação aparece antes da resposta', async () => {
        const h = harness(estado([linha({ id: 'a' })]));
        const pendente = adiada();
        void runLineCheck({ lineId: 'a', data: { status: 'CHECKED' }, previous: h.get().lines[0], marker: 'm1', update: h.update, send: () => pendente.promise, notifyError: jest.fn() });
        expect(h.get().lines[0].status).toBe('CHECKED');
        pendente.reject(ERRO_DO_BACK);
    });

    it('recusa do back: desfaz e avisa uma vez com a mensagem do back', async () => {
        const h = harness(estado([linha({ id: 'a' })]));
        const notifyError = jest.fn();
        const ok = await runLineCheck({ lineId: 'a', data: { status: 'CHECKED' }, previous: h.get().lines[0], marker: 'm1', update: h.update, send: () => Promise.reject(ERRO_DO_BACK), notifyError });
        expect(ok).toBe(false);
        expect(h.get().lines[0].status).toBe('PENDING');
        expect(h.get().allChecked).toBe(false);
        expect(notifyError).toHaveBeenCalledTimes(1);
        expect(notifyError).toHaveBeenCalledWith('Item não pertence a este pedido');
    });

    it('sem rede: avisa com a mensagem do adapter, não com o texto padrão', async () => {
        const h = harness(estado([linha({ id: 'a' })]));
        const notifyError = jest.fn();
        await runLineCheck({ lineId: 'a', data: { status: 'CHECKED' }, previous: h.get().lines[0], marker: 'm1', update: h.update, send: () => Promise.reject(SEM_REDE), notifyError });
        expect(notifyError).toHaveBeenCalledWith('Sem conexão com o servidor. Verifique sua internet e tente novamente.');
    });

    it('sem mensagem útil: o texto padrão', async () => {
        const h = harness(estado([linha({ id: 'a' })]));
        const notifyError = jest.fn();
        await runLineCheck({ lineId: 'a', data: { status: 'CHECKED' }, previous: h.get().lines[0], marker: 'm1', update: h.update, send: () => Promise.reject(SEM_MENSAGEM), notifyError });
        expect(notifyError).toHaveBeenCalledWith(CHECK_FALLBACK_MESSAGE);
        expect(CHECK_FALLBACK_MESSAGE).toBe('Não foi possível conferir o item. Tente de novo.');
    });

    it('uma falha atrasada não apaga o re-check que já deu certo', async () => {
        const h = harness(estado([linha({ id: 'a' })]));
        const primeira = adiada();
        const notifyError = jest.fn();
        const r1 = runLineCheck({ lineId: 'a', data: { status: 'MISSING' }, previous: h.get().lines[0], marker: 'm1', update: h.update, send: () => primeira.promise, notifyError });
        await runLineCheck({ lineId: 'a', data: { status: 'CHECKED' }, previous: h.get().lines[0], marker: 'm2', update: h.update, send: async () => ({ success: true }), notifyError });
        primeira.reject(ERRO_DO_BACK);
        await r1;
        expect(h.get().lines[0]).toMatchObject({ status: 'CHECKED', checkedAt: 'm2' });
        expect(notifyError).toHaveBeenCalledTimes(1);
    });

    it('linha que não está na lista: nada a desfazer, mas avisa', async () => {
        const h = harness(estado([linha({ id: 'a' })]));
        const notifyError = jest.fn();
        await runLineCheck({ lineId: 'zz', data: { status: 'CHECKED' }, previous: undefined, marker: 'm1', update: h.update, send: () => Promise.reject(ERRO_DO_BACK), notifyError });
        expect(h.get().lines[0].status).toBe('PENDING');
        expect(notifyError).toHaveBeenCalledTimes(1);
    });
});
