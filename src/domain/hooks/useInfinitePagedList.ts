// src/domain/hooks/useInfinitePagedList.ts
import { useCallback, useMemo } from 'react';

import { useInfiniteQuery } from '@tanstack/react-query';

import { mergeById, nextPageParam, PagedResponse } from './pagination';

export interface InfinitePagedList<T> {
    items: T[];
    isLoading: boolean;
    /** Também é `true` quando só a PRÓXIMA página falhou; ver `isFetchNextPageError`. */
    isError: boolean;
    isFetchNextPageError: boolean;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    loadMore: () => void;
    refetch: () => void;
    /** Pull-to-refresh, sem contar o spinner de "carregar mais". */
    isRefreshing: boolean;
}

/**
 * Lista paginada que ACUMULA: cada página nova entra no fim, e o pull-to-refresh refaz
 * todas as páginas já carregadas (comportamento do `useInfiniteQuery`).
 */
export function useInfinitePagedList<T extends { id: string }>(
    queryKey: readonly unknown[],
    fetchPage: (page: number) => Promise<PagedResponse<T>>,
    options: { enabled: boolean; staleTime?: number },
): InfinitePagedList<T> {
    const query = useInfiniteQuery({
        queryKey,
        queryFn: ({ pageParam }) => fetchPage(pageParam),
        initialPageParam: 1,
        getNextPageParam: (lastPage) => nextPageParam(lastPage?.meta),
        enabled: options.enabled,
        staleTime: options.staleTime ?? 60_000,
    });

    const { data, hasNextPage, isFetchingNextPage, fetchNextPage, refetch: refetchQuery } = query;

    const items = useMemo(() => mergeById(data?.pages), [data]);

    const loadMore = useCallback(() => {
        if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    const refetch = useCallback(() => {
        void refetchQuery();
    }, [refetchQuery]);

    return {
        items,
        isLoading: query.isLoading,
        isError: query.isError,
        isFetchNextPageError: query.isFetchNextPageError,
        hasNextPage: !!hasNextPage,
        isFetchingNextPage,
        loadMore,
        refetch,
        isRefreshing: query.isRefetching && !isFetchingNextPage,
    };
}
