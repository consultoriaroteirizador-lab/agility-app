import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { Id } from '@/types/base';

import { recurrenceService } from '../recurrenceService';

export function useIncrementRouteRecurrenceUsage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: Id) => recurrenceService.incrementRouteRecurrenceUsage(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recurrences', 'routes'] });
        },
    });
}

