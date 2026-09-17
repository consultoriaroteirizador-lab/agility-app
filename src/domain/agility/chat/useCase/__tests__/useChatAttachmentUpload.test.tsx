import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TestRenderer, { act } from 'react-test-renderer';

import { useChatAttachmentUpload } from '../useChatAttachmentUpload';

const mockUploadChatAttachments = jest.fn();
jest.mock('../../../service/serviceUploadUtils', () => ({
    uploadChatAttachments: (...args: unknown[]) => mockUploadChatAttachments(...args),
}));

type Hook = ReturnType<typeof useChatAttachmentUpload>;

// Desmonta e limpa ao fim de cada teste. O `queryClient.clear()` nao cancela o timer de gc
// de uma mutation (5 min por padrao), que segura o jest: por isso `gcTime: Infinity`
// (sem timer) nas mutations.
const cleanups: (() => void)[] = [];

function setup() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false, gcTime: Infinity } },
    });
    let hook!: Hook;
    function Probe() {
        hook = useChatAttachmentUpload();
        return null;
    }
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
        renderer = TestRenderer.create(
            <QueryClientProvider client={queryClient}>
                <Probe />
            </QueryClientProvider>,
        );
    });
    let unmounted = false;
    const unmount = () => {
        if (unmounted) return;
        unmounted = true;
        act(() => renderer.unmount());
    };
    cleanups.push(() => {
        unmount();
        queryClient.clear();
    });
    return { getHook: () => hook, unmount };
}

function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

async function flush() {
    for (let i = 0; i < 10; i++) {
        await Promise.resolve();
    }
}

beforeEach(() => {
    mockUploadChatAttachments.mockReset();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
    cleanups.splice(0).forEach((cleanup) => cleanup());
    jest.restoreAllMocks();
});

describe('useChatAttachmentUpload', () => {
    it('devolve a chave do upload no formato { success, result }', async () => {
        mockUploadChatAttachments.mockResolvedValue({ urls: ['chat/c1/chat-1.jpg'] });
        const { getHook } = setup();

        let result: unknown;
        await act(async () => {
            result = await getHook().uploadAttachments({ files: ['file:///a.jpg'], chatId: 'chat-1' });
        });

        expect(result).toEqual({ success: true, result: { urls: ['chat/c1/chat-1.jpg'] } });
    });

    it('resolve mesmo se a tela desmontar no meio do upload', async () => {
        const upload = deferred<{ urls: string[] }>();
        mockUploadChatAttachments.mockReturnValue(upload.promise);
        const { getHook, unmount } = setup();

        let settled: unknown = 'pendente';
        const pending = getHook().uploadAttachments({ files: ['file:///a.jpg'], chatId: 'chat-1' });
        pending.then((value) => { settled = value; }, (error) => { settled = error; });

        unmount();
        upload.resolve({ urls: ['chat/c1/chat-1.jpg'] });
        await flush();

        expect(settled).toEqual({ success: true, result: { urls: ['chat/c1/chat-1.jpg'] } });
    });

    it('rejeita com o erro original mesmo se a tela desmontar no meio do upload', async () => {
        const upload = deferred<{ urls: string[] }>();
        mockUploadChatAttachments.mockReturnValue(upload.promise);
        const { getHook, unmount } = setup();

        let settled: unknown = 'pendente';
        const pending = getHook().uploadAttachments({ files: ['file:///a.jpg'], chatId: 'chat-1' });
        pending.then((value) => { settled = value; }, (error) => { settled = error; });

        unmount();
        const failure = new Error('rede');
        upload.reject(failure);
        await flush();

        expect(settled).toBe(failure);
    });

    it('rejeita quando o upload nao devolve chave', async () => {
        mockUploadChatAttachments.mockResolvedValue({ urls: [] });
        const { getHook } = setup();

        await act(async () => {
            await expect(
                getHook().uploadAttachments({ files: ['file:///a.jpg'], chatId: 'chat-1' }),
            ).rejects.toThrow('no URLs returned');
        });
    });
});
