import { useEffect, useState } from 'react';

import { useInfiniteQuery } from '@tanstack/react-query';

import { PageResponse } from '@/api';

export interface UsePaginatedListResult<TData> {
    list: TData[];
    isError: boolean | null;
    isLoading: boolean;
    isRefetching: boolean;
    refresh: () => void;
    fetchPreviousPage: () => void;
    fetchNextPage: () => void;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}

interface PaginatedListOption {
    enabled?: boolean;
    staleTime?: number;
}

export function usePaginatedList<Data>(
    queryKey: readonly unknown[],
    getList: (page: number) => Promise<PageResponse<Data>>,
    options?: PaginatedListOption,
): UsePaginatedListResult<Data> {
    const [list, setList] = useState<Data[]>([]);

    const query = useInfiniteQuery({
        queryKey,
        queryFn: ({ pageParam }) => getList(pageParam),
        getNextPageParam: (lastPage) => {
            if (!lastPage.last) {
                return lastPage.currentPage + 1;
            }
            return undefined;
        },
        getPreviousPageParam: (firstPage) => {
            if (!firstPage.first) {
                return firstPage.currentPage - 1;
            }
            return undefined;
        },
        initialPageParam: 0,
        enabled: options?.enabled ?? true,
        staleTime: options?.staleTime ?? 0,
    });

    useEffect(() => {
        if (query.data) {
            const newList = query.data.pages.reduce<Data[]>((prev, curr) => {
                return [...prev, ...(curr.items || [])];
            }, []);
            setList(newList);
        }
    }, [query.data]);

    return {
        list,
        isError: query.isError,
        isLoading: query.isLoading,
        refresh: query.refetch,
        fetchNextPage: query.fetchNextPage,
        fetchPreviousPage: query.fetchPreviousPage,
        hasNextPage: !!query.hasNextPage,
        hasPreviousPage: !!query.hasPreviousPage,
        isRefetching: query.isRefetching,
    };
}
