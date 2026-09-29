import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TestRenderer, { act } from 'react-test-renderer';

import type { PagedResponse } from '../pagination';
import { InfinitePagedList, useInfinitePagedList } from '../useInfinitePagedList';

type Item = { id: string };
const mockFetchPage = jest.fn<Promise<PagedResponse<Item>>, [number]>();

let lista!: InfinitePagedList<Item>;
function Probe() {
    lista = useInfinitePagedList<Item>(['teste', 'lista'], (page) => mockFetchPage(page), { enabled: true });
    return null;
}

let queryClient: QueryClient;
let tree: TestRenderer.ReactTestRenderer | null = null;

// O notifyManager do react-query agenda por setTimeout(0): esvaziar só a fila de microtasks não basta.
async function settle() {
    for (let i = 0; i < 10; i++) {
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });
    }
}

const pagina = (page: number, totalPages: number, ids: string[]): PagedResponse<Item> => ({
    data: ids.map((id) => ({ id })),
    meta: { page, totalPages },
});

beforeEach(() => {
    mockFetchPage.mockReset();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
});

afterEach(() => {
    if (tree) act(() => tree!.unmount());
    tree = null;
    queryClient.clear();
});

async function montar() {
    act(() => {
        tree = TestRenderer.create(
            <QueryClientProvider client={queryClient}>
                <Probe />
            </QueryClientProvider>,
        );
    });
    await settle();
}

describe('useInfinitePagedList', () => {
    it('carregar mais ACUMULA a página seguinte em vez de trocar', async () => {
        mockFetchPage.mockImplementation(async (page) => (page === 1 ? pagina(1, 2, ['a', 'b']) : pagina(2, 2, ['b', 'c'])));
        await montar();

        expect(lista.items.map((i) => i.id)).toEqual(['a', 'b']);
        expect(lista.hasNextPage).toBe(true);

        act(() => lista.loadMore());
        await settle();

        expect(lista.items.map((i) => i.id)).toEqual(['a', 'b', 'c']);
        expect(lista.hasNextPage).toBe(false);
        expect(mockFetchPage).toHaveBeenNthCalledWith(1, 1);
        expect(mockFetchPage).toHaveBeenNthCalledWith(2, 2);
    });

    it('falha na PRÓXIMA página mantém o que já carregou e sinaliza o erro da página', async () => {
        mockFetchPage.mockImplementation(async (page) => {
            if (page === 1) return pagina(1, 2, ['a']);
            throw { success: false, error: { message: 'Sem conexão', code: 'AU-000' } };
        });
        await montar();

        act(() => lista.loadMore());
        await settle();

        expect(lista.items.map((i) => i.id)).toEqual(['a']);
        expect(lista.isFetchNextPageError).toBe(true);
    });

    it('falha na primeira página é erro, não lista vazia', async () => {
        mockFetchPage.mockRejectedValue({ success: false, error: { message: 'Sem conexão', code: 'AU-000' } });
        await montar();

        expect(lista.isError).toBe(true);
        expect(lista.items).toEqual([]);
        expect(lista.isLoading).toBe(false);
    });
});
