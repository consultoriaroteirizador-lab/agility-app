// src/domain/hooks/pagination.ts

/**
 * Paginação por página (page/totalPages), no formato que o agility-services devolve em
 * `/wallet/transactions`, `/wallet/withdrawals`, `/wallet/advances` e `/finance/payments`.
 */
export interface PageMeta {
    page: number;
    totalPages: number;
    limit?: number;
    total?: number;
}

export interface PagedResponse<T> {
    data: T[];
    meta: PageMeta;
}

/** Próxima página, ou `undefined` na última. Sem `meta`, não há mais. */
export function nextPageParam(meta: PageMeta | undefined | null): number | undefined {
    if (!meta) return undefined;
    const page = Number(meta.page);
    const totalPages = Number(meta.totalPages);
    if (!Number.isFinite(page) || !Number.isFinite(totalPages)) return undefined;
    return page < totalPages ? page + 1 : undefined;
}

/**
 * Junta as páginas na ordem e descarta id repetido.
 *
 * O back ordena só por `createdAt`, sem desempate, e os lançamentos de um mesmo gesto
 * (liberar parcela + estorno, bloquear saque) saem da mesma transação com o mesmo
 * `createdAt`. Na fronteira de página a mesma linha pode vir duas vezes. Sem o descarte,
 * o extrato mostra o lançamento em dobro e o Ganhos soma em dobro.
 */
export function mergeById<T extends { id: string }>(pages: readonly { data: readonly T[] }[] | undefined): T[] {
    const seen = new Set<string>();
    const out: T[] = [];
    for (const page of pages ?? []) {
        for (const item of page.data ?? []) {
            if (seen.has(item.id)) continue;
            seen.add(item.id);
            out.push(item);
        }
    }
    return out;
}

/**
 * Busca todas as páginas até a última ou até `maxPages`. `truncated` avisa que parou no
 * teto: a tela diz "valores parciais" em vez de mostrar um total menor como se fosse o todo.
 */
export async function fetchAllPages<T extends { id: string }>(
    fetchPage: (page: number) => Promise<PagedResponse<T>>,
    maxPages: number,
): Promise<{ items: T[]; truncated: boolean }> {
    const pages: PagedResponse<T>[] = [];
    let page = 1;
    for (;;) {
        const response = await fetchPage(page);
        pages.push(response);
        const next = nextPageParam(response.meta);
        if (next === undefined) return { items: mergeById(pages), truncated: false };
        if (pages.length >= maxPages) return { items: mergeById(pages), truncated: true };
        page = next;
    }
}
