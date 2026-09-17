import React from 'react';

import TestRenderer, { act } from 'react-test-renderer';

import { serverDisconnectRetryDelay, useChatWebSocket, type UseChatWebSocketOptions } from '../useChatWebSocket';

type Handler = (...args: unknown[]) => void;
const mockHandlers: Record<string, Handler> = {};
const mockSocket = {
    id: 'sock-1',
    connected: false,
    on: jest.fn((event: string, fn: Handler) => {
        mockHandlers[event] = fn;
    }),
    emit: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
};
const mockIo = jest.fn((..._args: unknown[]) => mockSocket);
jest.mock('socket.io-client', () => ({ io: (...args: unknown[]) => mockIo(...args) }));

let mockAuth = {
    authCredentials: { accessToken: 'token-1', tenantId: 'tenant-1' },
    userAuth: { id: 'kc-1' },
};
jest.mock('@/services', () => ({ useAuthCredentialsService: () => mockAuth }));
jest.mock('@/config/urls', () => ({ urls: { agilityApi: 'https://api.test' } }));

function Probe(props: UseChatWebSocketOptions) {
    useChatWebSocket(props);
    return null;
}

// Arvores montadas no teste: desmontadas no afterEach para o jest nao ficar preso em timer.
let mounted: TestRenderer.ReactTestRenderer[] = [];

function render(props: UseChatWebSocketOptions = {}) {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
        tree = TestRenderer.create(<Probe {...props} />);
    });
    mounted.push(tree);
    return tree;
}

function unmount(tree: TestRenderer.ReactTestRenderer) {
    act(() => tree.unmount());
    mounted = mounted.filter((t) => t !== tree);
}

function ioOptions() {
    return mockIo.mock.calls[0][1] as {
        auth: (cb: (data: Record<string, unknown>) => void) => void;
        reconnectionAttempts: number;
        reconnectionDelayMax: number;
    };
}

beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockIo.mockClear();
    mockSocket.connect.mockClear();
    mockSocket.emit.mockClear();
    for (const k of Object.keys(mockHandlers)) delete mockHandlers[k];
    mockAuth = { authCredentials: { accessToken: 'token-1', tenantId: 'tenant-1' }, userAuth: { id: 'kc-1' } };
});

afterEach(() => {
    for (const tree of mounted) act(() => tree.unmount());
    mounted = [];
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
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

describe('useChatWebSocket — reconexao', () => {
    it('auth e funcao e entrega o token ATUAL a cada tentativa', () => {
        const tree = render();
        const { auth } = ioOptions();
        expect(typeof auth).toBe('function');

        mockAuth = { ...mockAuth, authCredentials: { accessToken: 'token-2', tenantId: 'tenant-1' } };
        act(() => tree.update(<Probe />));

        const cb = jest.fn();
        auth(cb);
        expect(cb).toHaveBeenCalledWith(expect.objectContaining({ token: 'token-2', userType: 'DRIVER', userId: 'kc-1' }));
        expect(mockIo).toHaveBeenCalledTimes(1);
    });

    it('token renovado durante a queda reaproveita o socket (sem segundo io)', () => {
        const tree = render();
        // Tentativa falhou: o socket segue vivo, reconectando, e nao ha conexao "em andamento".
        act(() => mockHandlers.connect_error(new Error('offline')));

        mockAuth = { ...mockAuth, authCredentials: { accessToken: 'token-2', tenantId: 'tenant-1' } };
        act(() => tree.update(<Probe />));

        expect(mockIo).toHaveBeenCalledTimes(1);
        expect(mockSocket.connect).toHaveBeenCalledTimes(1);
    });

    it('nao desiste de reconectar', () => {
        render();
        expect(ioOptions().reconnectionAttempts).toBe(Infinity);
        expect(ioOptions().reconnectionDelayMax).toBe(15_000);
    });

    it('servidor derrubou (token vencido): tenta de novo com backoff', () => {
        render();
        act(() => mockHandlers.disconnect('io server disconnect'));
        act(() => jest.advanceTimersByTime(1999));
        expect(mockSocket.connect).not.toHaveBeenCalled();
        act(() => jest.advanceTimersByTime(1));
        expect(mockSocket.connect).toHaveBeenCalledTimes(1);

        act(() => mockHandlers.disconnect('io server disconnect'));
        act(() => jest.advanceTimersByTime(3999));
        expect(mockSocket.connect).toHaveBeenCalledTimes(1);
        act(() => jest.advanceTimersByTime(1));
        expect(mockSocket.connect).toHaveBeenCalledTimes(2);
    });

    it('conexao confirmada zera o backoff', () => {
        render();
        act(() => mockHandlers.disconnect('io server disconnect'));
        act(() => jest.advanceTimersByTime(2000));
        act(() => mockHandlers.connected({}));
        act(() => mockHandlers.disconnect('io server disconnect'));
        act(() => jest.advanceTimersByTime(2000));
        expect(mockSocket.connect).toHaveBeenCalledTimes(2);
    });

    it('queda de transporte fica com o socket.io (sem connect manual)', () => {
        render();
        act(() => mockHandlers.disconnect('transport close'));
        act(() => jest.advanceTimersByTime(60_000));
        expect(mockSocket.connect).not.toHaveBeenCalled();
    });

    it('desmontar cancela a tentativa agendada', () => {
        const tree = render();
        act(() => mockHandlers.disconnect('io server disconnect'));
        expect(jest.getTimerCount()).toBe(1);

        unmount(tree);
        // O timer sai da fila, e nao so fica inofensivo quando dispara.
        expect(jest.getTimerCount()).toBe(0);
        act(() => jest.advanceTimersByTime(60_000));
        expect(mockSocket.connect).not.toHaveBeenCalled();
        expect(mockIo).toHaveBeenCalledTimes(1);
    });

    it('repassa o chat_history', () => {
        const onHistory = jest.fn();
        render({ onHistory });
        const data = { chatId: 'chat-1', messages: [] };
        act(() => mockHandlers.chat_history(data));
        expect(onHistory).toHaveBeenCalledWith(data);
    });
});
