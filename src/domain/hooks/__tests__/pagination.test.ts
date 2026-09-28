import { fetchAllPages, mergeById, nextPageParam } from '../pagination';

const item = (id: string) => ({ id });

describe('nextPageParam', () => {
    it('avança enquanto page < totalPages', () => {
        expect(nextPageParam({ page: 1, totalPages: 3 })).toBe(2);
    });

    it('para na última página', () => {
        expect(nextPageParam({ page: 3, totalPages: 3 })).toBeUndefined();
    });

    it('lista vazia (totalPages 0) não pede página 2', () => {
        expect(nextPageParam({ page: 1, totalPages: 0 })).toBeUndefined();
    });

    it('sem meta, não há próxima', () => {
        expect(nextPageParam(undefined)).toBeUndefined();
    });
});

describe('mergeById', () => {
    it('acumula na ordem das páginas', () => {
        const ids = mergeById([{ data: [item('a'), item('b')] }, { data: [item('c')] }]).map((i) => i.id);
        expect(ids).toEqual(['a', 'b', 'c']);
    });

    it('linha repetida na fronteira de página (mesmo createdAt no back) entra uma vez só', () => {
        const ids = mergeById([{ data: [item('a'), item('b')] }, { data: [item('b'), item('c')] }]).map((i) => i.id);
        expect(ids).toEqual(['a', 'b', 'c']);
    });
});

describe('fetchAllPages', () => {
    it('busca até a última página e descarta repetidos', async () => {
        const fetchPage = jest.fn(async (page: number) =>
            page === 1
                ? { data: [item('a'), item('b')], meta: { page: 1, totalPages: 2 } }
                : { data: [item('b'), item('c')], meta: { page: 2, totalPages: 2 } },
        );

        const result = await fetchAllPages(fetchPage, 10);

        expect(result).toEqual({ items: [item('a'), item('b'), item('c')], truncated: false });
        expect(fetchPage).toHaveBeenCalledTimes(2);
    });

    it('para no teto e avisa que truncou', async () => {
        const fetchPage = jest.fn(async (page: number) => ({ data: [item(`i${page}`)], meta: { page, totalPages: 50 } }));

        const result = await fetchAllPages(fetchPage, 3);

        expect(result.truncated).toBe(true);
        expect(result.items.map((i) => i.id)).toEqual(['i1', 'i2', 'i3']);
        expect(fetchPage).toHaveBeenCalledTimes(3);
    });
});
