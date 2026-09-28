/**
 * Os gateways do backend (/chat, /monitoring, /notifications) validam o token SÓ no handshake;
 * com token vencido emitem `error` e derrubam a conexão (`io server disconnect`), e nesse caso o
 * socket.io-client NÃO tenta de novo. O helper é o único lugar onde essa regra mora.
 */
import { createAuthedSocket, serverDisconnectRetryDelay } from '../createAuthedSocket';

type Handler = (...args: unknown[]) => void;
const mockHandlers: Record<string, Handler[]> = {};
const mockSocket = {
    on: jest.fn((event: string, fn: Handler) => {
        (mockHandlers[event] ??= []).push(fn);
    }),
    connect: jest.fn(),
    disconnect: jest.fn(),
};
const mockIo = jest.fn((..._args: unknown[]) => mockSocket);
jest.mock('socket.io-client', () => ({ io: (...args: unknown[]) => mockIo(...args) }));
jest.mock('@/config/urls', () => ({ urls: { agilityApi: 'https://api.test' } }));

function fire(event: string, ...args: unknown[]) {
    (mockHandlers[event] ?? []).forEach((h) => h(...args));
}

function ioOptions() {
    return mockIo.mock.calls[0][1] as {
        auth: (cb: (data: Record<string, unknown>) => void) => void;
        reconnection: boolean;
        reconnectionAttempts: number;
        path?: string;
        query?: Record<string, string>;
    };
}

beforeEach(() => {
    jest.useFakeTimers();
    mockIo.mockClear();
    mockSocket.connect.mockClear();
    mockSocket.disconnect.mockClear();
    for (const k of Object.keys(mockHandlers)) delete mockHandlers[k];
});

afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
});

describe('serverDisconnectRetryDelay', () => {
    it.each([
        [0, 2000],
        [1, 4000],
        [3, 16000],
        [4, 30000],
        [10, 30000],
    ])('tentativa %i -> %i ms', (attempt, expected) => {
        expect(serverDisconnectRetryDelay(attempt)).toBe(expected);
    });
});

describe('createAuthedSocket', () => {
    it('monta a URL wss do namespace e repassa path/query', () => {
        createAuthedSocket({ namespace: '/monitoring', getAuth: () => ({}), path: '/socket.io', query: { a: '1' } });
        expect(mockIo.mock.calls[0][0]).toBe('wss://api.test/monitoring');
        expect(ioOptions().path).toBe('/socket.io');
        expect(ioOptions().query).toEqual({ a: '1' });
    });

    it('auth é função: cada tentativa lê o token ATUAL', () => {
        let token = 'token-1';
        createAuthedSocket({ namespace: '/chat', getAuth: () => ({ token }) });

        token = 'token-2';
        const cb = jest.fn();
        ioOptions().auth(cb);
        expect(cb).toHaveBeenCalledWith({ token: 'token-2' });
    });

    it('não desiste de reconectar numa queda de rede', () => {
        createAuthedSocket({ namespace: '/chat', getAuth: () => ({}) });
        expect(ioOptions().reconnection).toBe(true);
        expect(ioOptions().reconnectionAttempts).toBe(Infinity);
    });

    it('`io server disconnect`: pede renovação do token e reconecta com backoff', () => {
        const onServerDisconnect = jest.fn();
        createAuthedSocket({ namespace: '/chat', getAuth: () => ({}), onServerDisconnect });

        fire('disconnect', 'io server disconnect');
        expect(onServerDisconnect).toHaveBeenCalledTimes(1);
        jest.advanceTimersByTime(1999);
        expect(mockSocket.connect).not.toHaveBeenCalled();
        jest.advanceTimersByTime(1);
        expect(mockSocket.connect).toHaveBeenCalledTimes(1);

        // Segunda recusa seguida: espera dobra.
        fire('disconnect', 'io server disconnect');
        jest.advanceTimersByTime(3999);
        expect(mockSocket.connect).toHaveBeenCalledTimes(1);
        jest.advanceTimersByTime(1);
        expect(mockSocket.connect).toHaveBeenCalledTimes(2);
    });

    it('`connected` do servidor zera o backoff', () => {
        createAuthedSocket({ namespace: '/chat', getAuth: () => ({}) });
        fire('disconnect', 'io server disconnect');
        jest.advanceTimersByTime(2000);
        fire('connected');
        fire('disconnect', 'io server disconnect');
        jest.advanceTimersByTime(2000);
        expect(mockSocket.connect).toHaveBeenCalledTimes(2);
    });

    it('queda de transporte fica com o socket.io (sem connect manual nem renovação)', () => {
        const onServerDisconnect = jest.fn();
        createAuthedSocket({ namespace: '/chat', getAuth: () => ({}), onServerDisconnect });
        fire('disconnect', 'transport close');
        jest.advanceTimersByTime(60_000);
        expect(mockSocket.connect).not.toHaveBeenCalled();
        expect(onServerDisconnect).not.toHaveBeenCalled();
    });

    it('onReady avisa se é RE-conexão (o servidor esqueceu as salas e não reenvia o perdido)', () => {
        const onReady = jest.fn();
        const onDisconnect = jest.fn();
        createAuthedSocket({ namespace: '/chat', getAuth: () => ({}), onReady, onDisconnect });

        fire('connected', { ok: true });
        expect(onReady).toHaveBeenLastCalledWith({ reconnected: false });

        fire('disconnect', 'transport close');
        expect(onDisconnect).toHaveBeenCalledWith('transport close');
        fire('connected');
        expect(onReady).toHaveBeenLastCalledWith({ reconnected: true });

        fire('connected');
        expect(onReady).toHaveBeenLastCalledWith({ reconnected: false });
    });

    it('dispose cancela a tentativa agendada e desconecta', () => {
        const { dispose } = createAuthedSocket({ namespace: '/chat', getAuth: () => ({}) });
        fire('disconnect', 'io server disconnect');
        expect(jest.getTimerCount()).toBe(1);

        dispose();
        expect(jest.getTimerCount()).toBe(0);
        expect(mockSocket.disconnect).toHaveBeenCalledTimes(1);

        // O `disconnect` do próprio cliente não agenda nada.
        fire('disconnect', 'io server disconnect');
        jest.advanceTimersByTime(60_000);
        expect(mockSocket.connect).not.toHaveBeenCalled();
    });
});
