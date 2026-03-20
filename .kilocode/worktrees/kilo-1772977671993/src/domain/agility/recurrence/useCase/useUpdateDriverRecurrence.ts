import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { Id } from '@/types/base';

import type { UpdateDriverRecurrenceRequest } from '../dto';
import { recurrenceService } from '../recurrenceService';

export function useUpdateDriverRecurrence() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, payload }: { id: Id; payload: UpdateDriverRecurrenceRequest }) =>
            recurrenceService.updateDriverRecurrence(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recurrences', 'drivers'] });
        },
    });
}
