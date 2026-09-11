/**
 * O socket global /monitoring é compartilhado entre o LocationTrackingProvider
 * (dono de `offer.available`) e telas como o detalhe da rota
 * (`useRouteLiveSync`). Antes, cada consumidor contava 1 ao conectar e
 * descontava 2 ao desmontar (o próprio `disconnect` + o cleanup interno do
 * hook), e quem reusava o socket não anexava os próprios listeners: sair do
 * detalhe da rota zerava o contador e derrubava o socket da oferta (A5).
 * Voltar do background chamava `connect()` de novo e podia criar um SEGUNDO
 * socket enquanto o primeiro estava em backoff (A6).
 */
import React, { useEffect } from 'react';

import TestRenderer, { act } from 'react-test-renderer';

import { __resetTrackingSocketForTests, useTrackingWebSocket } from '../useTrackingWebSocket';

type Handler = (...a: unknown[]) => void;

jest.mock('socket.io-client', () => {
    const sockets: unknown[] = [];
    function makeSocket() {
        const handlers: Record<string, Handler[]> = {};
        return {
            connected: true,
            on: jest.fn((ev: string, fn: Handler) => { (handlers[ev] ??= []).push(fn); }),
            off: jest.fn((ev: string, fn: Handler) => { handlers[ev] = (handlers[ev] ?? []).filter((h) => h !== fn); }),
            emit: jest.fn(),
            connect: jest.fn(),
            disconnect: jest.fn(),
            removeAllListeners: jest.fn(() => { Object.keys(handlers).forEach((k) => delete handlers[k]); }),
            __fire: (ev: string, ...a: unknown[]) => (handlers[ev] ?? []).forEach((h) => h(...a)),
        };
    }
    return {
        io: jest.fn(() => { const s = makeSocket(); sockets.push(s); return s; }),
        __sockets: sockets,
    };
});

let mockAccessToken = 't1';
jest.mock('@/services/authCredentials/useAuthCredentialsService', () => ({
    useAuthCredentialsService: () => ({
        userAuth: { id: 'u1' },
        authCredentials: { accessToken: mockAccessToken, tenantId: 'ten' },
    }),
}));

interface MockSocket {
    connected: boolean;
    emit: jest.Mock;
    connect: jest.Mock;
    disconnect: jest.Mock;
    removeAllListeners: jest.Mock;
    __fire: (ev: string, ...a: unknown[]) => void;
}

const socketIo = jest.requireMock('socket.io-client') as { io: jest.Mock; __sockets: MockSocket[] };

type Hook = ReturnType<typeof useTrackingWebSocket>;

/** Dono do socket (LocationTrackingProvider): conecta e escuta a oferta. */
function Dono({ onOffer, onConnect, capture }: {
    onOffer?: (o: unknown) => void;
    onConnect?: () => void;
    capture?: (h: Hook) => void;
}) {
    const hook = useTrackingWebSocket({ onOfferAvailable: onOffer, onConnect });
    capture?.(hook);
    const { connect } = hook;
    useEffect(() => { connect(); }, [connect]);
    return null;
}

/** Detalhe da rota (useRouteLiveSync): conecta e desconecta no próprio efeito. */
function Detalhe() {
    const { connect, disconnect } = useTrackingWebSocket({ onRoutingUpdated: () => {} });
    useEffect(() => { connect(); return () => disconnect(); }, [connect, disconnect]);
    return null;
}

/** Consumidor sem efeito próprio: o teste decide quando chamar connect. */
function Manual({ capture }: { capture: (h: Hook) => void }) {
    capture(useTrackingWebSocket({}));
    return null;
}

beforeEach(() => {
    __resetTrackingSocketForTests();
    socketIo.__sockets.length = 0;
    mockAccessToken = 't1';
    jest.clearAllMocks();
});

describe('useTrackingWebSocket — socket compartilhado entre consumidores', () => {
    it('desmontar um segundo consumidor não derruba o socket nem o listener de oferta do primeiro', () => {
        const onOffer = jest.fn();

        let dono!: TestRenderer.ReactTestRenderer;
        let detalhe!: TestRenderer.ReactTestRenderer;
        act(() => { dono = TestRenderer.create(<Dono onOffer={onOffer} />); });
        act(() => { detalhe = TestRenderer.create(<Detalhe />); });
        act(() => { detalhe.unmount(); });

        const socket = socketIo.__sockets[0];
        expect(socket.disconnect).not.toHaveBeenCalled();
        act(() => { socket.__fire('offer.available', { id: 'r1' }); });
        expect(onOffer).toHaveBeenCalledWith({ id: 'r1' });
        act(() => { dono.unmount(); });
    });

    it('o consumidor que REUSA o socket recebe os próprios eventos', () => {
        const onRoutingUpdated = jest.fn();
        function DetalheQueEscuta() {
            const { connect, disconnect } = useTrackingWebSocket({ onRoutingUpdated });
            useEffect(() => { connect(); return () => disconnect(); }, [connect, disconnect]);
            return null;
        }

        let dono!: TestRenderer.ReactTestRenderer;
        let detalhe!: TestRenderer.ReactTestRenderer;
        act(() => { dono = TestRenderer.create(<Dono />); });
        act(() => { detalhe = TestRenderer.create(<DetalheQueEscuta />); });

        act(() => { socketIo.__sockets[0].__fire('routing_updated', { id: 'rota-1' }); });
        expect(onRoutingUpdated).toHaveBeenCalledWith({ id: 'rota-1' });

        // Depois de desmontar, o listener do detalhe sai do socket.
        act(() => { detalhe.unmount(); });
        onRoutingUpdated.mockClear();
        act(() => { socketIo.__sockets[0].__fire('routing_updated', { id: 'rota-1' }); });
        expect(onRoutingUpdated).not.toHaveBeenCalled();
        act(() => { dono.unmount(); });
    });

    it('desconecta o socket quando o ÚLTIMO consumidor desmonta', () => {
        let dono!: TestRenderer.ReactTestRenderer;
        let detalhe!: TestRenderer.ReactTestRenderer;
        act(() => { dono = TestRenderer.create(<Dono />); });
        act(() => { detalhe = TestRenderer.create(<Detalhe />); });
        act(() => { detalhe.unmount(); });
        act(() => { dono.unmount(); });

        const socket = socketIo.__sockets[0];
        expect(socket.removeAllListeners).toHaveBeenCalledTimes(1);
        expect(socket.disconnect).toHaveBeenCalledTimes(1);
    });

    it('o evento `connected` do servidor emite subscribe_routings e chama onConnect', () => {
        const onConnect = jest.fn();
        let dono!: TestRenderer.ReactTestRenderer;
        act(() => { dono = TestRenderer.create(<Dono onConnect={onConnect} />); });

        const socket = socketIo.__sockets[0];
        act(() => { socket.__fire('connected'); });
        expect(socket.emit).toHaveBeenCalledWith('subscribe_routings', { tenantId: 'ten' });
        expect(onConnect).toHaveBeenCalledTimes(1);
        act(() => { dono.unmount(); });
    });
});

describe('useTrackingWebSocket — reconexão sem socket duplicado (A6)', () => {
    it('reconnect reusa o socket existente em vez de criar outro', () => {
        let hook!: Hook;
        let dono!: TestRenderer.ReactTestRenderer;
        act(() => { dono = TestRenderer.create(<Dono capture={(h) => { hook = h; }} />); });

        const socket = socketIo.__sockets[0];
        socket.connected = false; // caiu e está em backoff
        act(() => { hook.reconnect(); });

        expect(socketIo.io).toHaveBeenCalledTimes(1);
        expect(socket.connect).toHaveBeenCalledTimes(1);

        // A reconexão não soma referência: desmontar o único dono derruba o socket.
        act(() => { dono.unmount(); });
        expect(socket.disconnect).toHaveBeenCalledTimes(1);
    });

    it('um segundo consumidor que conecta durante o backoff reusa o socket (não cria órfão)', () => {
        let dono!: TestRenderer.ReactTestRenderer;
        let detalhe!: TestRenderer.ReactTestRenderer;
        act(() => { dono = TestRenderer.create(<Dono />); });
        socketIo.__sockets[0].connected = false;
        act(() => { detalhe = TestRenderer.create(<Detalhe />); });

        expect(socketIo.io).toHaveBeenCalledTimes(1);
        act(() => { detalhe.unmount(); });
        act(() => { dono.unmount(); });
        expect(socketIo.__sockets[0].disconnect).toHaveBeenCalledTimes(1);
    });

    it('troca de token recria o socket, e quem segurava o socket VELHO não derruba o novo', () => {
        let a!: Hook;
        let b!: Hook;
        let rA!: TestRenderer.ReactTestRenderer;
        let rB!: TestRenderer.ReactTestRenderer;
        act(() => { rA = TestRenderer.create(<Manual capture={(h) => { a = h; }} />); });
        act(() => { rB = TestRenderer.create(<Manual capture={(h) => { b = h; }} />); });
        act(() => { a.connect(); b.connect(); });
        expect(socketIo.io).toHaveBeenCalledTimes(1);

        // Token renovado: A reconecta primeiro, com o token novo.
        mockAccessToken = 't2';
        act(() => { rA.update(<Manual capture={(h) => { a = h; }} />); });
        act(() => { a.connect(); });

        const [velho, novo] = socketIo.__sockets;
        expect(socketIo.io).toHaveBeenCalledTimes(2);
        expect(velho.disconnect).toHaveBeenCalledTimes(1);

        // B ainda segurava o socket velho: desmontar B não pode derrubar o novo.
        act(() => { rB.unmount(); });
        expect(novo.disconnect).not.toHaveBeenCalled();

        act(() => { rA.unmount(); });
        expect(novo.disconnect).toHaveBeenCalledTimes(1);
    });
});
