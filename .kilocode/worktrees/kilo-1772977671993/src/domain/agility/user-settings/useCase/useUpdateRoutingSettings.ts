import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { UpdateUserSettingsRequest } from '../dto';
import { userSettingsService } from '../userSettingsService';

export function useUpdateRoutingSettings() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: UpdateUserSettingsRequest) => userSettingsService.updateRoutingSettings(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user-settings', 'routing'] });
        },
    });
}

