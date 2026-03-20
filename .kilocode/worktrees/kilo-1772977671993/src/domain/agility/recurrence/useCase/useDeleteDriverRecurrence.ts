import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { Id } from '@/types/base';

import { recurrenceService } from '../recurrenceService';

export function useDeleteDriverRecurrence() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: Id) => recurrenceService.deleteDriverRecurrence(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recurrences', 'drivers'] });
        },
    });
}
