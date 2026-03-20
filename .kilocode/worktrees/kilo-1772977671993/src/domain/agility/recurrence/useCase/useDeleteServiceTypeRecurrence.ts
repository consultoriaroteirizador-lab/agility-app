import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { Id } from '@/types/base';

import { recurrenceService } from '../recurrenceService';

export function useDeleteServiceTypeRecurrence() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: Id) => recurrenceService.deleteServiceTypeRecurrence(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recurrences', 'service-types'] });
        },
    });
}
