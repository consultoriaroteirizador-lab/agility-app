import type { ServiceLine } from '@/domain/agility/service/dto/response/service-line.response';

import {
    applyCheck,
    CHECK_FALLBACK_MESSAGE,
    checkedLine,
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

describe('checkedLine', () => {
    it('aplica status, quantidade, nota, foto e marcador sem mexer nos outros campos', () => {
        const base = linha({ id: 'a', material: 'Caixa', quantity: 3, direction: 'PICKUP', checkNotes: 'velha' });
        const r = checkedLine(base, { status: 'PARTIAL', actualQuantity: 2, notes: 'faltou 1', photoProof: 'f' }, 'm9');
        expect(r).toEqual({ ...base, status: 'PARTIAL', actualQuantity: 2, checkNotes: 'faltou 1', checkPhotoProof: 'f', checkedAt: 'm9' });
        expect(base.checkNotes).toBe('velha');
    });
});

describe('runLineCheck', () => {
    it('sucesso: a marcação fica e ninguém é avisado', async () => {
        const confirmada = linha({ id: 'a' });
        const h = harness(estado([confirmada]));
        const notifyError = jest.fn();
        const ok = await runLineCheck({ lineId: 'a', data: { status: 'CHECKED' }, confirmed: () => confirmada, onConfirmed: jest.fn(), marker: 'm1', update: h.update, send: async () => ({ success: true }), notifyError });
        expect(ok).toBe(true);
        expect(h.get().lines[0].status).toBe('CHECKED');
        expect(notifyError).not.toHaveBeenCalled();
    });

    it('a marcação aparece antes da resposta', async () => {
        const confirmada = linha({ id: 'a' });
        const h = harness(estado([confirmada]));
        const pendente = adiada();
        void runLineCheck({ lineId: 'a', data: { status: 'CHECKED' }, confirmed: () => confirmada, onConfirmed: jest.fn(), marker: 'm1', update: h.update, send: () => pendente.promise, notifyError: jest.fn() });
        expect(h.get().lines[0].status).toBe('CHECKED');
        pendente.reject(ERRO_DO_BACK);
    });

    it('recusa do back: desfaz e avisa uma vez com a mensagem do back', async () => {
        const confirmada = linha({ id: 'a' });
        const h = harness(estado([confirmada]));
        const notifyError = jest.fn();
        const ok = await runLineCheck({ lineId: 'a', data: { status: 'CHECKED' }, confirmed: () => confirmada, onConfirmed: jest.fn(), marker: 'm1', update: h.update, send: () => Promise.reject(ERRO_DO_BACK), notifyError });
        expect(ok).toBe(false);
        expect(h.get().lines[0].status).toBe('PENDING');
        expect(h.get().allChecked).toBe(false);
        expect(notifyError).toHaveBeenCalledTimes(1);
        expect(notifyError).toHaveBeenCalledWith('Item não pertence a este pedido');
    });

    it('sem rede: avisa com a mensagem do adapter, não com o texto padrão', async () => {
        const confirmada = linha({ id: 'a' });
        const h = harness(estado([confirmada]));
        const notifyError = jest.fn();
        await runLineCheck({ lineId: 'a', data: { status: 'CHECKED' }, confirmed: () => confirmada, onConfirmed: jest.fn(), marker: 'm1', update: h.update, send: () => Promise.reject(SEM_REDE), notifyError });
        expect(notifyError).toHaveBeenCalledWith('Sem conexão com o servidor. Verifique sua internet e tente novamente.');
    });

    it('sem mensagem útil: o texto padrão', async () => {
        const confirmada = linha({ id: 'a' });
        const h = harness(estado([confirmada]));
        const notifyError = jest.fn();
        await runLineCheck({ lineId: 'a', data: { status: 'CHECKED' }, confirmed: () => confirmada, onConfirmed: jest.fn(), marker: 'm1', update: h.update, send: () => Promise.reject(SEM_MENSAGEM), notifyError });
        expect(notifyError).toHaveBeenCalledWith(CHECK_FALLBACK_MESSAGE);
        expect(CHECK_FALLBACK_MESSAGE).toBe('Não foi possível conferir o item. Tente de novo.');
    });

    it('uma falha atrasada não apaga o re-check que já deu certo', async () => {
        const confirmada = linha({ id: 'a' });
        const h = harness(estado([confirmada]));
        const primeira = adiada();
        const notifyError = jest.fn();
        const r1 = runLineCheck({ lineId: 'a', data: { status: 'MISSING' }, confirmed: () => confirmada, onConfirmed: jest.fn(), marker: 'm1', update: h.update, send: () => primeira.promise, notifyError });
        await runLineCheck({ lineId: 'a', data: { status: 'CHECKED' }, confirmed: () => confirmada, onConfirmed: jest.fn(), marker: 'm2', update: h.update, send: async () => ({ success: true }), notifyError });
        primeira.reject(ERRO_DO_BACK);
        await r1;
        expect(h.get().lines[0]).toMatchObject({ status: 'CHECKED', checkedAt: 'm2' });
        expect(notifyError).toHaveBeenCalledTimes(1);
    });

    it('linha que não está na lista: nada a desfazer, mas avisa', async () => {
        const confirmada = linha({ id: 'a' });
        const h = harness(estado([confirmada]));
        const notifyError = jest.fn();
        await runLineCheck({ lineId: 'zz', data: { status: 'CHECKED' }, confirmed: () => undefined, onConfirmed: jest.fn(), marker: 'm1', update: h.update, send: () => Promise.reject(ERRO_DO_BACK), notifyError });
        expect(h.get().lines[0].status).toBe('PENDING');
        expect(notifyError).toHaveBeenCalledTimes(1);
    });

    it('duas falhas sobrepostas voltam à linha CONFIRMADA pelo servidor, não à marca da outra chamada', async () => {
        const confirmada = linha({ id: 'a' });
        const h = harness(estado([confirmada]));
        const p1 = adiada();
        const p2 = adiada();
        const notifyError = jest.fn();
        const r1 = runLineCheck({ lineId: 'a', data: { status: 'MISSING' }, confirmed: () => confirmada, onConfirmed: jest.fn(), marker: 'm1', update: h.update, send: () => p1.promise, notifyError });
        const r2 = runLineCheck({ lineId: 'a', data: { status: 'CHECKED' }, confirmed: () => confirmada, onConfirmed: jest.fn(), marker: 'm2', update: h.update, send: () => p2.promise, notifyError });
        p1.reject(ERRO_DO_BACK);
        await r1;
        p2.reject(ERRO_DO_BACK);
        await r2;
        expect(h.get().lines[0]).toEqual(confirmada);
        expect(h.get().allChecked).toBe(false);
        expect(notifyError).toHaveBeenCalledTimes(2);
    });

    it('falha depois de um sucesso volta à marcação confirmada (a que o sucesso gravou)', async () => {
        const mapa = new Map<string, ServiceLine>([['a', linha({ id: 'a' })]]);
        const h = harness(estado([mapa.get('a')!]));
        const onConfirmed = jest.fn((l: ServiceLine) => { mapa.set(l.id, l); });
        const args = { lineId: 'a', confirmed: () => mapa.get('a'), onConfirmed, update: h.update, notifyError: jest.fn() };
        await runLineCheck({ ...args, data: { status: 'MISSING', notes: 'sumiu' }, marker: 'm1', send: async () => ({ success: true }) });
        expect(onConfirmed).toHaveBeenCalledWith(expect.objectContaining({ id: 'a', status: 'MISSING', checkNotes: 'sumiu', checkedAt: 'm1' }));
        await runLineCheck({ ...args, data: { status: 'CHECKED' }, marker: 'm2', send: () => Promise.reject(ERRO_DO_BACK) });
        expect(h.get().lines[0]).toMatchObject({ status: 'MISSING', checkNotes: 'sumiu', checkedAt: 'm1' });
    });

    it('falha não chama onConfirmed', async () => {
        const confirmada = linha({ id: 'a' });
        const h = harness(estado([confirmada]));
        const onConfirmed = jest.fn();
        await runLineCheck({ lineId: 'a', data: { status: 'CHECKED' }, confirmed: () => confirmada, onConfirmed, marker: 'm1', update: h.update, send: () => Promise.reject(ERRO_DO_BACK), notifyError: jest.fn() });
        expect(onConfirmed).not.toHaveBeenCalled();
    });
});
