import { useQuery } from '@tanstack/react-query';

import type { DriverRecurrenceResponse } from '../dto';
import { recurrenceService } from '../recurrenceService';

export function useFindAllDriverRecurrences() {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery<DriverRecurrenceResponse[]>({
        queryKey: ['recurrences', 'drivers'],
        queryFn: () => recurrenceService.findAllDriverRecurrences(),
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

