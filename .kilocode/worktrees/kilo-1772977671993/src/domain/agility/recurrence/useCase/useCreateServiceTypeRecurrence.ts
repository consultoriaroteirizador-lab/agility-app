import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { CreateServiceTypeRecurrenceRequest } from '../dto';
import { recurrenceService } from '../recurrenceService';

export function useCreateServiceTypeRecurrence() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: CreateServiceTypeRecurrenceRequest) => recurrenceService.createServiceTypeRecurrence(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recurrences', 'service-types'] });
        },
    });
}

