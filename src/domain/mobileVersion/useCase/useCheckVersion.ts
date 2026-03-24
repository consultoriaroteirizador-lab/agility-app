import { useQuery } from '@tanstack/react-query';

import { KEY_MOBILE_VERSION } from '@/types/queryKey';

import { mobileVersionService } from '../mobileVersionService';

export function useCheckVersion() {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: [KEY_MOBILE_VERSION],
        queryFn: () => mobileVersionService.checkVersion(),
        retry: false,
        staleTime: 60 * 60 * 1000, // 1 hora
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });

    return {
        checkVersion: data?.result,
        isLoading,
        isError,
        refetch,
        isRefetching,
    };
}
