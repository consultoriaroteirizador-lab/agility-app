import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { Id } from '@/types/base';

import type { UpdateServiceTypeRecurrenceRequest } from '../dto';
import { recurrenceService } from '../recurrenceService';

export function useUpdateServiceTypeRecurrence() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, payload }: { id: Id; payload: UpdateServiceTypeRecurrenceRequest }) =>
            recurrenceService.updateServiceTypeRecurrence(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recurrences', 'service-types'] });
        },
    });
}
