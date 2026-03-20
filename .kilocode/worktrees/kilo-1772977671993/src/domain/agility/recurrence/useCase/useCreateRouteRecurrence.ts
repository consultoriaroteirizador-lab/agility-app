import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { CreateRouteRecurrenceRequest } from '../dto';
import { recurrenceService } from '../recurrenceService';

export function useCreateRouteRecurrence() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: CreateRouteRecurrenceRequest) => recurrenceService.createRouteRecurrence(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recurrences', 'routes'] });
        },
    });
}

