import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { Id } from '@/types/base';

import { recurrenceService } from '../recurrenceService';

export function useIncrementDriverRecurrenceUsage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: Id) => recurrenceService.incrementDriverRecurrenceUsage(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recurrences', 'drivers'] });
        },
    });
}

