import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { CreateDriverRecurrenceRequest } from '../dto';
import { recurrenceService } from '../recurrenceService';

export function useCreateDriverRecurrence() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: CreateDriverRecurrenceRequest) => recurrenceService.createDriverRecurrence(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recurrences', 'drivers'] });
        },
    });
}

