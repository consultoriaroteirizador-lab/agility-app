import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { Id } from '@/types/base';

import { recurrenceService } from '../recurrenceService';

export function useIncrementServiceTypeRecurrenceUsage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: Id) => recurrenceService.incrementServiceTypeRecurrenceUsage(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recurrences', 'service-types'] });
        },
    });
}

