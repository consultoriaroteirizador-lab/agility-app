import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { Id } from '@/types/base';

import { recurrenceService } from '../recurrenceService';

export function useDeleteRouteRecurrence() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: Id) => recurrenceService.deleteRouteRecurrence(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recurrences', 'routes'] });
        },
    });
}
