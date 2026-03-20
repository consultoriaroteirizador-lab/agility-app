import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { Id } from '@/types/base';

import type { UpdateRouteRecurrenceRequest } from '../dto';
import { recurrenceService } from '../recurrenceService';

export function useUpdateRouteRecurrence() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, payload }: { id: Id; payload: UpdateRouteRecurrenceRequest }) =>
            recurrenceService.updateRouteRecurrence(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recurrences', 'routes'] });
        },
    });
}
