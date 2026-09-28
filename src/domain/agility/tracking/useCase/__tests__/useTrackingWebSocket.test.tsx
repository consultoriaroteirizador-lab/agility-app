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

function ioOptions() {
    return socketIo.io.mock.calls[0][1] as {
        auth: (cb: (data: Record<string, unknown>) => void) => void;
        reconnectionAttempts: number;
    };
}

afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
});

beforeEach(() => {
    jest.useFakeTimers();
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

    it('troca de token NÃO recria o socket: o próximo handshake já lê o token novo', () => {
        let a!: Hook;
        let b!: Hook;
        let rA!: TestRenderer.ReactTestRenderer;
        let rB!: TestRenderer.ReactTestRenderer;
        act(() => { rA = TestRenderer.create(<Manual capture={(h) => { a = h; }} />); });
        act(() => { rB = TestRenderer.create(<Manual capture={(h) => { b = h; }} />); });
        act(() => { a.connect(); b.connect(); });

        // Token renovado: A chama connect de novo (o efeito do consumidor depende do token).
        mockAccessToken = 't2';
        act(() => { rA.update(<Manual capture={(h) => { a = h; }} />); });
        act(() => { a.connect(); });

        const [socket] = socketIo.__sockets;
        expect(socketIo.io).toHaveBeenCalledTimes(1);
        expect(socket.disconnect).not.toHaveBeenCalled();
        const cb = jest.fn();
        ioOptions().auth(cb);
        expect(cb).toHaveBeenCalledWith(expect.objectContaining({ token: 't2', tenantId: 'ten', userId: 'u1' }));

        // As duas referências continuam valendo: só a ÚLTIMA a sair derruba o socket.
        act(() => { rB.unmount(); });
        expect(socket.disconnect).not.toHaveBeenCalled();
        act(() => { rA.unmount(); });
        expect(socket.disconnect).toHaveBeenCalledTimes(1);
    });
});

describe('useTrackingWebSocket — token vencido e reconexão', () => {
    it('auth é função e não desiste de reconectar', () => {
        let dono!: TestRenderer.ReactTestRenderer;
        act(() => { dono = TestRenderer.create(<Dono />); });
        expect(typeof ioOptions().auth).toBe('function');
        expect(ioOptions().reconnectionAttempts).toBe(Infinity);
        act(() => { dono.unmount(); });
    });

    it('`io server disconnect`: avisa o consumidor (renovar o token por REST) e reconecta com backoff', () => {
        const onServerDisconnect = jest.fn();
        function ComRenovacao() {
            const { connect } = useTrackingWebSocket({ onServerDisconnect });
            useEffect(() => { connect(); }, [connect]);
            return null;
        }
        let r!: TestRenderer.ReactTestRenderer;
        act(() => { r = TestRenderer.create(<ComRenovacao />); });

        const socket = socketIo.__sockets[0];
        act(() => { socket.__fire('disconnect', 'io server disconnect'); });
        expect(onServerDisconnect).toHaveBeenCalledTimes(1);
        expect(socket.connect).not.toHaveBeenCalled();
        act(() => { jest.advanceTimersByTime(2000); });
        expect(socket.connect).toHaveBeenCalledTimes(1);
        act(() => { r.unmount(); });
    });

    it('reconexão re-inscreve em :routings e avisa onReconnect; a primeira conexão não', () => {
        const onReconnect = jest.fn();
        function ComReconexao() {
            const { connect } = useTrackingWebSocket({ onReconnect });
            useEffect(() => { connect(); }, [connect]);
            return null;
        }
        let r!: TestRenderer.ReactTestRenderer;
        act(() => { r = TestRenderer.create(<ComReconexao />); });

        const socket = socketIo.__sockets[0];
        act(() => { socket.__fire('connected'); });
        expect(onReconnect).not.toHaveBeenCalled();

        act(() => { socket.__fire('disconnect', 'transport close'); });
        act(() => { socket.__fire('connected'); });
        expect(socket.emit).toHaveBeenCalledTimes(2);
        expect(socket.emit).toHaveBeenLastCalledWith('subscribe_routings', { tenantId: 'ten' });
        expect(onReconnect).toHaveBeenCalledTimes(1);
        act(() => { r.unmount(); });
    });
});
