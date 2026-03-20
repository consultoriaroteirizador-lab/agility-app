import { useQuery } from '@tanstack/react-query';

import type { RouteRecurrenceResponse } from '../dto';
import { recurrenceService } from '../recurrenceService';

export function useFindAllRouteRecurrences() {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery<RouteRecurrenceResponse[]>({
        queryKey: ['recurrences', 'routes'],
        queryFn: () => recurrenceService.findAllRouteRecurrences(),
        retry: false,
    });

    return {
        data: data || [],
        isLoading,
        isError,
        refetch,
        isRefetching,
    };
}

