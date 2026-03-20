import { useQuery } from '@tanstack/react-query';

import type { ServiceTypeRecurrenceResponse } from '../dto';
import { recurrenceService } from '../recurrenceService';

export function useFindAllServiceTypeRecurrences() {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery<ServiceTypeRecurrenceResponse[]>({
        queryKey: ['recurrences', 'service-types'],
        queryFn: () => recurrenceService.findAllServiceTypeRecurrences(),
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

